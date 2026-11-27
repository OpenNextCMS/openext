// src/app/api/auth/admin/route.ts
import { NextRequest } from 'next/server';
import { AuthService } from '@/modules/auth/authService';
import { registerSchema } from '@/modules/auth/authValidation';
import mongoose from 'mongoose';
import { MasterDb } from '@/models/MasterDb';
import User, { IUser } from '@/models/User';
import Page from '@/models/Page';
import { withDbName, isValidMongoUri } from '@/utils/mongoUri';
import { getMysqlConnection, ensureCmsMysqlSchema, dropLegacyMysqlDatabases, resolveMysqlDatabaseName } from '@/lib/db/mysql/adapter';
import {
  getPostgresConnection,
  ensureCmsPostgresSchema,
  dropLegacyPostgresDatabases,
  resolvePostgresDatabaseName,
} from '@/lib/db/postgres/adapter';
import {
  ensureEnvFileExists,
  writeMongodbInstallEnv,
  writeMysqlInstallEnv,
  writePostgresInstallEnv,
} from '@/lib/db/writeInstallEnv';
import type { MysqlCredentials, PostgresCredentials } from '@/lib/db/config';
import {
  ensureDefaultHomePage,
  type DefaultHomePageModel,
} from '@/services/ensureDefaultHomePage';

export async function POST(req: NextRequest) {
  let userDbConnection: mongoose.Connection | null = null;
  let masterConnection: mongoose.Connection | null = null;
  let pageDbConnection: mongoose.Connection | null = null;

  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const {
      userDbName = 'users',
      pageDbName = 'pages',
      mongodbCredentials,
      mysqlCredentials,
      postgresCredentials,
      defaultData,
      dbType,
    } = body;

    if (dbType === 'mysql' || mysqlCredentials) {
      return registerWithMysql({
        validatedData,
        userDbName,
        pageDbName,
        mysqlCredentials,
        defaultData,
      });
    }

    if (dbType === 'postgres' || postgresCredentials) {
      return registerWithPostgres({
        validatedData,
        userDbName,
        pageDbName,
        postgresCredentials,
        defaultData,
      });
    }

    const { username, password, host, cluster, authMech, mongoDB, authSource, uri } =
      mongodbCredentials || {};

    let masterDbUri, userDbUri, pageDbUri;
    if (mongoDB === 'uri') {
      if (!uri || !isValidMongoUri(uri)) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'A valid MongoDB connection URI is required',
            registration: 'failed',
          }),
          { status: 400 }
        );
      }
      masterDbUri = withDbName(uri, 'master');
      userDbUri = withDbName(uri, userDbName);
      pageDbUri = withDbName(uri, pageDbName);
    } else if (mongoDB === 'atlas') {
      masterDbUri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/master?retryWrites=true&w=majority&appName=${cluster}`;
      userDbUri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/${userDbName}?retryWrites=true&w=majority&appName=${cluster}`;
      pageDbUri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/${pageDbName}?retryWrites=true&w=majority&appName=${cluster}`;
    } else if (mongoDB === 'compass') {
      masterDbUri = `mongodb://${username}:${password}@${host}/master?authMechanism=${authMech}&authSource=${authSource}`;
      userDbUri = `mongodb://${username}:${password}@${host}/${userDbName}?authMechanism=${authMech}&authSource=${authSource}`;
      pageDbUri = `mongodb://${username}:${password}@${host}/${pageDbName}?authMechanism=${authMech}&authSource=${authSource}`;
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid MongoDB type', registration: 'failed' }),
        { status: 400 }
      );
    }

    userDbConnection = await mongoose.createConnection(userDbUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });

    masterConnection = await mongoose.createConnection(masterDbUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });

    pageDbConnection = await mongoose.createConnection(pageDbUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });

    const UserModel = userDbConnection.model<IUser>('User', User.schema);
    const MasterDbModel = masterConnection.model('MasterDb', MasterDb.schema);
    const PageModel = pageDbConnection.model('Page', Page.schema);

    const authData = await AuthService.register(validatedData, UserModel);

    if ('error' in authData) {
      return new Response(
        JSON.stringify({ success: false, message: authData.error, registration: 'failed' }),
        { status: 400 }
      );
    }

    const masterDbDoc = new MasterDbModel({
      userDbName,
      pageDbName,
      userDbUri,
      pageDbUri,
    });

    await masterDbDoc.save({ wtimeout: 30000 });

    await ensureDefaultHomePage({
      pageModel: PageModel as unknown as DefaultHomePageModel,
      createdBy: authData.user._id,
      component: defaultData,
    });

    await ensureEnvFileExists();
    await writeMongodbInstallEnv({
      userDbName,
      pageDbName,
      mongoDB,
      uri,
      username,
      password,
      host,
      cluster,
      authMech,
      authSource,
    });

    return new Response(
      JSON.stringify({
        success: true,
        needsRestart: true,
        message: 'Registration successful',
        data: authData.user,
        role: authData.user.role,
        isRegistration: 'successful',
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
        isRegistration: 'failed',
      }),
      { status: 500 }
    );
  } finally {
    if (userDbConnection) await userDbConnection.close();
    if (masterConnection) await masterConnection.close();
    if (pageDbConnection) await pageDbConnection.close();
  }
}

async function registerWithMysql(params: {
  validatedData: ReturnType<typeof registerSchema.parse>;
  userDbName: string;
  pageDbName: string;
  mysqlCredentials: MysqlCredentials;
  defaultData: unknown;
}) {
  const { validatedData, userDbName, pageDbName, mysqlCredentials, defaultData } = params;

  if (!mysqlCredentials?.host || !mysqlCredentials?.user) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'MySQL host and username are required',
        registration: 'failed',
      }),
      { status: 400 }
    );
  }

  const creds = {
    host: String(mysqlCredentials.host),
    port: Number(mysqlCredentials.port || 3306),
    user: String(mysqlCredentials.user),
    password: String(mysqlCredentials.password || ''),
    database: mysqlCredentials.database ? String(mysqlCredentials.database).trim() : undefined,
  };

  const mysqlDbName = resolveMysqlDatabaseName(creds);

  await dropLegacyMysqlDatabases(creds);
  await ensureCmsMysqlSchema(creds);

  const userConn = await getMysqlConnection('users', creds);
  const masterConn = await getMysqlConnection('master', creds);
  const pageConn = await getMysqlConnection('pages', creds);

  const UserModel = userConn.model('User', User.schema);
  const MasterDbModel = masterConn.model('MasterDb', MasterDb.schema);
  const PageModel = pageConn.model('Page', Page.schema);

  const authData = await AuthService.register(
    validatedData,
    UserModel as unknown as mongoose.Model<IUser>
  );

  if ('error' in authData) {
    return new Response(
      JSON.stringify({ success: false, message: authData.error, registration: 'failed' }),
      { status: 400 }
    );
  }

  await MasterDbModel.create({
    userDbName,
    pageDbName,
    userDbUri: `mysql://${creds.user}@${creds.host}:${creds.port}/${mysqlDbName}`,
    pageDbUri: `mysql://${creds.user}@${creds.host}:${creds.port}/${mysqlDbName}`,
  });

  await ensureDefaultHomePage({
    pageModel: PageModel as unknown as DefaultHomePageModel,
    createdBy: authData.user._id,
    component: defaultData,
  });

  await ensureEnvFileExists();
  await writeMysqlInstallEnv({
    userDbName,
    pageDbName,
    mysql: creds,
  });

  return new Response(
    JSON.stringify({
      success: true,
      needsRestart: true,
      message: 'Registration successful',
      data: authData.user,
      role: authData.user.role,
      isRegistration: 'successful',
    }),
    { status: 201 }
  );
}

async function registerWithPostgres(params: {
  validatedData: ReturnType<typeof registerSchema.parse>;
  userDbName: string;
  pageDbName: string;
  postgresCredentials: PostgresCredentials;
  defaultData: unknown;
}) {
  const { validatedData, userDbName, pageDbName, postgresCredentials, defaultData } = params;

  if (!postgresCredentials?.host || !postgresCredentials?.user) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'PostgreSQL host and username are required',
        registration: 'failed',
      }),
      { status: 400 }
    );
  }

  const creds = {
    host: String(postgresCredentials.host),
    port: Number(postgresCredentials.port || 5432),
    user: String(postgresCredentials.user),
    password: String(postgresCredentials.password || ''),
    database: postgresCredentials.database
      ? String(postgresCredentials.database).trim()
      : undefined,
  };

  const postgresDbName = resolvePostgresDatabaseName(creds);

  await dropLegacyPostgresDatabases(creds);
  await ensureCmsPostgresSchema(creds);

  const userConn = await getPostgresConnection('users', creds);
  const masterConn = await getPostgresConnection('master', creds);
  const pageConn = await getPostgresConnection('pages', creds);

  const UserModel = userConn.model('User', User.schema);
  const MasterDbModel = masterConn.model('MasterDb', MasterDb.schema);
  const PageModel = pageConn.model('Page', Page.schema);

  const authData = await AuthService.register(
    validatedData,
    UserModel as unknown as mongoose.Model<IUser>
  );

  if ('error' in authData) {
    return new Response(
      JSON.stringify({ success: false, message: authData.error, registration: 'failed' }),
      { status: 400 }
    );
  }

  await MasterDbModel.create({
    userDbName,
    pageDbName,
    userDbUri: `postgres://${creds.user}@${creds.host}:${creds.port}/${postgresDbName}`,
    pageDbUri: `postgres://${creds.user}@${creds.host}:${creds.port}/${postgresDbName}`,
  });

  await ensureDefaultHomePage({
    pageModel: PageModel as unknown as DefaultHomePageModel,
    createdBy: authData.user._id,
    component: defaultData,
  });

  await ensureEnvFileExists();
  await writePostgresInstallEnv({
    userDbName,
    pageDbName,
    postgres: creds,
  });

  return new Response(
    JSON.stringify({
      success: true,
      needsRestart: true,
      message: 'Registration successful',
      data: authData.user,
      role: authData.user.role,
      isRegistration: 'successful',
    }),
    { status: 201 }
  );
}

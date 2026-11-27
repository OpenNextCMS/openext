import dotenv from 'dotenv';
dotenv.config();
const e = process.env;
console.log('DB_TYPE=', e.DB_TYPE || '(unset)');
console.log('MYSQL_HOST=', e.MYSQL_HOST || '(unset)');
console.log('MYSQL_DATABASE=', e.MYSQL_DATABASE || '(unset)');
console.log('MONGODB=', e.MONGODB || '(unset)');
const u = e.MONGODB_URI || '';
console.log('MONGODB_URI set=', Boolean(u));
if (u) {
  try {
    const x = new URL(u);
    console.log('host=', x.hostname);
    console.log('port=', x.port || '(default)');
    console.log('path=', x.pathname);
  } catch (err) {
    console.log('parse err=', err.message);
    console.log('prefix=', JSON.stringify(u.slice(0, 40)));
  }
}

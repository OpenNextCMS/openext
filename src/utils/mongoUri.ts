export function withDbName(uri: string, dbName: string): string {
  const schemeEnd = uri.indexOf('://');
  if (schemeEnd === -1) {
    throw new Error('Invalid MongoDB URI: missing scheme');
  }
  const scheme = uri.slice(0, schemeEnd + 3);
  const rest = uri.slice(schemeEnd + 3);

  const queryIdx = rest.search(/[?#]/);
  const beforeQuery = queryIdx === -1 ? rest : rest.slice(0, queryIdx);
  const queryAndAfter = queryIdx === -1 ? '' : rest.slice(queryIdx);

  const atIdx = beforeQuery.lastIndexOf('@');
  const searchFrom = atIdx === -1 ? 0 : atIdx + 1;
  const pathSlashIdx = beforeQuery.indexOf('/', searchFrom);
  const authority = pathSlashIdx === -1 ? beforeQuery : beforeQuery.slice(0, pathSlashIdx);

  return `${scheme}${authority}/${encodeURIComponent(dbName)}${queryAndAfter}`;
}

export function isValidMongoUri(uri: string): boolean {
  return /^mongodb(\+srv)?:\/\/.+/.test(uri.trim());
}

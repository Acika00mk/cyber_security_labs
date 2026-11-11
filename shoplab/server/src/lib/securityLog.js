export function securityLog(fields) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    ...fields,
  }));
}
    
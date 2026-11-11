// server/src/lib/securityLog.js
function securityLog(fields) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    ...fields,
  }));
}

module.exports= securityLog;
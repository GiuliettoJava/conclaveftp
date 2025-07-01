// lib/connectFtp.js

import ftp from "basic-ftp";

export async function connectFtp(configFTP) {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  client.ftp.encoding = "utf8";

  try {
    await client.access({
      host: configFTP.host,
      port: configFTP.port || 21,
      user: configFTP.user,
      password: configFTP.password,
      secure: true,
      secureOptions: {
        rejectUnauthorized: false,
        ciphers: "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256",
      },
    });
    
    return client;
  } catch (err) {
    client.close();
    throw new Error(
      `"⚠️ Connection failed: "${err}"`
    );
  }
}

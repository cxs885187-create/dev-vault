// src/lib/encryption.ts
import crypto from 'crypto';

// 确保秘钥一定是 32 字节
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'FallbackSecretKeyPleaseChange!!!';
const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
const ALGORITHM = 'aes-256-gcm';

export function encryptApiKey(text: string): string {
  if (!text) return text;
  
  // 生成随机初始化向量
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // 最终存入数据库的格式：iv:密文:authTag
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

export function decryptApiKey(text: string): string {
  if (!text) return text;
  
  // 架构师的优雅后门：向下兼容以前存的“明文数据”
  if (!text.includes(':')) return text; 
  
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text;
    
    const [ivHex, encryptedHex, authTagHex] = parts;
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      keyBuffer, 
      Buffer.from(ivHex, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('API Key 解密失败，可能秘钥已被篡改', error);
    return ''; // 解密失败直接返回空，强制兜底
  }
}
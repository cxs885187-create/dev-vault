import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'FallbackSecretKeyPleaseChange!!!'
const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
const ALGORITHM = 'aes-256-gcm'

export function encryptApiKey(text: string): string {
  if (!text) {
    return text
  }

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  return `${iv.toString('hex')}:${encrypted}:${authTag}`
}

export function decryptApiKey(text: string): string {
  if (!text) {
    return text
  }

  // 向后兼容历史上以明文保存的 API Key。
  if (!text.includes(':')) {
    return text
  }

  try {
    const parts = text.split(':')

    if (parts.length !== 3) {
      return text
    }

    const [ivHex, encryptedHex, authTagHex] = parts
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, Buffer.from(ivHex, 'hex'))

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('API Key 解密失败，请检查 ENCRYPTION_KEY 是否发生变更。', error)
    return ''
  }
}

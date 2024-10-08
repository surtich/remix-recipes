import crypto from "crypto"; // es de node no necesita instalación

export function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex"); 
}

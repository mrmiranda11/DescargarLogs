import dotenv from 'dotenv';
dotenv.config();

export interface SftpConfig {
  username: string;
  password?: string;
}

// Objeto en memoria
let dynamicConfig: Partial<SftpConfig> = {};

// Guardar valores nuevos (cuando falle autenticación)
export function setConfig(config: Partial<SftpConfig>): void {
  dynamicConfig = { ...dynamicConfig, ...config };
}

// Obtener todo el objeto (dinámico primero, luego .env)
export function getConfig(): SftpConfig {
  return {
    username: dynamicConfig.username || process.env['sftp.server.user'] || "",
    password: dynamicConfig.password || process.env['sftp.server.password'],
  };
}

// Obtener una variable específica
export function getUsername(): string {
  return dynamicConfig.username || process.env['sftp.server.user'] || "";
}

export function getPassword(): string | undefined {
  return dynamicConfig.password || process.env['sftp.server.password'];
}

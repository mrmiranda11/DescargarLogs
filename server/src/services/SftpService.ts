import { Request,Response } from "express";
import SftpClient from 'ssh2-sftp-client'
import fs from "fs";
import path from 'path';

    // Función para asegurar que el directorio local exista 
    const ensureDirExists = (dir: string) => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true }); 
                console.log("Directorio creado:", dir); 
        } else { 
            console.log("Directorio ya existe:", dir); 
        } 
    };


export async function testSftp(parameter:any) {
    const sftp = new SftpClient();
    try {
        await sftp.connect(parameter);
        console.log('✅ Conexión SFTP exitosa');
        //debugger;
        await sftp.end();
        console.log('🔌 Conexión cerrada');
        return true;
    } catch (err) {
        throw err;
    }
}    
export async function connectSftpDemo(parameter:any,req:Request,res:Response) {

    const sftp = new SftpClient();
    var pathRemoto="";
    var pathLocal="";
    
    try {
        
        res.write(`data: ${JSON.stringify({type: 'progress',message: 'Conectando al servidor: '+parameter.host})}\n\n`);
        await sftp.connect(parameter);
        console.log('✅ Conexión SFTP exitosa');
        //descargar archivo
        for (const instance of parameter.instancias) {
            for (const file of parameter.files) {
                res.write(`data: ${JSON.stringify({type: 'progress',message: `Instancia:  ${instance}`})}\n\n`);
                pathRemoto = parameter.dirRemoto+instance+file+".log";
                pathLocal = "C:/Users/e10517a/Documents/NetBeansProjects/DescargarSeo"+parameter.dirLocal+instance;
                ensureDirExists(pathLocal);
                res.write(`data: ${JSON.stringify({type: 'progress',message: `Inicio la descarga de ${file}.log`})}\n\n`);
                await sftp.get(pathRemoto, pathLocal+file+".log");
                //console.log("pathRemoto" , parameter.dirRemoto+instance+file+".log");
                res.write(`data: ${JSON.stringify({type: 'progress',message: `Descarga completa`})}\n\n`);
                //console.log("pathLocal", "C:/Users/e10517a/Documents/NetBeansProjects/DescargarSeo"+parameter.dirLocal+instance);
            }
            
        }
        await sftp.end();
        res.write(`data: ${JSON.stringify({type: 'progress',message: 'Conexion cerrada...'})}\n\n`);
        console.log('🔌 Conexión cerrada');
        return true;
    } catch (err) {
        console.error('Error en conexión SFTP:', err);
        throw err;
    }
}
export async function connectSftpProd(parameter:any) {
    const sftp = new SftpClient();

    try {
        await sftp.connect(parameter);
        console.log('✅ Conexión SFTP exitosa');

        // Ejemplo: listar archivos en el directorio remoto
        const list = await sftp.list(parameter.dirRemoto);
        console.log('📂 Archivos:', list);

        /*// Ejemplo: descargar archivo
        await sftp.get('/ruta/remota/archivo.txt', 'local/archivo.txt');

        // Ejemplo: subir archivo
        await sftp.put('local/archivo.txt', '/ruta/remota/archivo.txt');*/

        await sftp.end();
        console.log('🔌 Conexión cerrada');
    } catch (err) {
        console.error('Error en conexión SFTP:', err);
    }
}
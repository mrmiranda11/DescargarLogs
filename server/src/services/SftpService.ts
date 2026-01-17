import { Request,Response } from "express";
import { unlink, readdir } from "fs/promises";
import SftpClient from 'ssh2-sftp-client'
import fs from "fs";
import path from 'path';
import zlib from "zlib";

// Función para asegurar que el directorio local exista 
const ensureDirExists = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true }); 
        console.log("Directorio creado:", dir); 
    } 
};

//Funcion para eliminar el archivos anteriores
export async function clearDirectory(dir:string){
    fs.readdir(dir, (err, archivos) => {
        if (err) {
            return;
        }
        // Iterar sobre cada archivo y eliminarlo
        archivos.forEach((archivo) => {
            const rutaCompleta = path.join(dir, archivo);

            fs.unlink(rutaCompleta, (err) => {
                if (err) {
                return;
                } 
            });
        });
    });
    
};

export async function eliminarComprimidos(dir:string){
    fs.readdir(dir, (err, archivos) => {
        if (err) {
            return;
        }
        // Iterar sobre cada archivo y eliminarlo
        archivos.forEach((archivo) => {
            const rutaCompleta = path.join(dir, archivo);
            if(archivo.endsWith(".gz")){
                fs.unlink(rutaCompleta, (err) => {
                    if (err) {
                    return;
                    } 
                });
            }
        });
    });
    
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
        res.write(`data: ${JSON.stringify({type: 'server',message: 'Conectando al servidor: '+parameter.host})}\n\n`);
        await sftp.connect(parameter);
        

        //descargar archivo
        for (const instance of parameter.instancias) {
            pathLocal = "C:/Users/e10517a/Documents/NetBeansProjects/DescargarSeo"+parameter.dirLocal+instance;
            ensureDirExists(pathLocal);
            res.write(`data: ${JSON.stringify({type: 'info',message: `Instancia:  ${instance}`})}\n\n`);
            for (const file of parameter.files) {
                if(parameter.fecha){
                    pathRemoto = parameter.dirRemoto+instance+file+"-"+parameter.fecha+".log.gz";
                    res.write(`data: ${JSON.stringify({type: 'progress',message: `Inicio la descarga de ${file}-${parameter.fecha}.log`})}\n\n`);
                    await sftp.get(pathRemoto, pathLocal+file+"-"+parameter.fecha+".log.gz");
                    var pathGzIn = pathLocal+file+"-"+parameter.fecha+".log.gz"; 
                    var pathGzOut = pathGzIn.substring(0,pathGzIn.length-3);
                    //await descomprimirYEliminar(pathGzIn,pathGzOut);
                    fs.createReadStream(pathGzIn)
                        .pipe(zlib.createGunzip())
                        .pipe(fs.createWriteStream(pathGzOut))
                        .on('close', () => {
                            if (fs.existsSync(pathGzIn)) {
                                /*fs.unlink(pathLocalGz, (err) => {
                                    if (err) {
                                        console.error(`No se pudo eliminar ${pathLocalGz}:`, err);
                                    } else {
                                        console.log(`Archivo eliminado: ${pathLocalGz}`);
                                    }
                                });*/
                            }
                        });
                        
                    
                }else{
                    pathRemoto = parameter.dirRemoto+instance+file+".log";
                    res.write(`data: ${JSON.stringify({type: 'progress',message: `Inicio la descarga de ${file}.log`})}\n\n`);
                    await sftp.get(pathRemoto, pathLocal+file+".log");
                    //console.log("pathRemoto" , parameter.dirRemoto+instance+file+".log");
                }
                //res.write(`data: ${JSON.stringify({type: 'progress',message: `Descarga completa`})}\n\n`);
                //console.log("pathLocal", "C:/Users/e10517a/Documents/NetBeansProjects/DescargarSeo"+parameter.dirLocal+instance);
            }
            
        }
        await sftp.end();
        res.write(`data: ${JSON.stringify({type: 'progress',message: 'Conexion cerrada...'})}\n\n`);
        //console.log('🔌 Conexión cerrada');
        return true;
    } catch (err) {
        //console.error('Error en conexión SFTP:', err);
        throw err;
    }
}

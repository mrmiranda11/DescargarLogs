import { Request, Response } from "express";
import { unlink, readdir } from "fs/promises";
import SftpClient from 'ssh2-sftp-client'
import fs from "fs";
import path from 'path';
import zlib from "zlib";
import { pipeline } from "stream";
import { promisify } from "util";

const pipe = promisify(pipeline);
// Función para asegurar que el directorio local exista 
const ensureDirExists = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log("Directorio creado:", dir);
    }
};

//Funcion para eliminar el archivos anteriores
export async function clearDirectory(dir: string) {
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

export async function eliminarComprimidos(dir: string) {
    fs.readdir(dir, (err, archivos) => {
        if (err) {
            return;
        }
        // Iterar sobre cada archivo y eliminarlo
        archivos.forEach((archivo) => {
            const rutaCompleta = path.join(dir, archivo);
            if (archivo.endsWith(".gz")) {
                fs.unlink(rutaCompleta, (err) => {
                    if (err) {
                        return;
                    }
                });
            }
        });
    });

};

export async function testSftp(parameter: any) {
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

export async function connectSftpDemo(parameter: any, req: Request, res: Response) {

    const sftp = new SftpClient();
    var pathRemoto = "";
    var pathLocal = "";
    var fileLocal = "";
    var pathGzIn = "";
    var pathGzOut = "";

    try {
        res.write(`data: ${JSON.stringify({ type: 'server', message: 'Conectando al servidor: ' + parameter.host })}\n\n`);
        await sftp.connect(parameter);


        //descargar archivo
        for (const instance of parameter.instancias) {
            pathLocal = "C:/Users/e10517a/Documents/NetBeansProjects/DescargarSeo" + parameter.dirLocal + instance;
            ensureDirExists(pathLocal);
            res.write(`data: ${JSON.stringify({ type: 'info', message: `Instancia:  ${instance}` })}\n\n`);
            for (const file of parameter.files) {
                if (parameter.fecha) {
                    pathRemoto = parameter.dirRemoto + instance + file + "-" + parameter.fecha + ".log.gz";
                    res.write(`data: ${JSON.stringify({ type: 'progress', message: `Inicio la descarga de ${file}-${parameter.fecha}.log` })}\n\n`);
                    try {
                        const stats = await sftp.stat(pathRemoto);
                        fileLocal = pathLocal + file + "-" + parameter.fecha + ".log.gz";
                        pathGzIn = pathLocal + file + "-" + parameter.fecha + ".log.gz";
                        pathGzOut = pathGzIn.substring(0, pathGzIn.length - 3);
                    } catch (err: any) {
                        if (err.code === 2 || err.code === 'ENOENT') { // código 2 = No such file 
                            pathRemoto = pathRemoto.substring(0, pathRemoto.length - 3)
                            fileLocal = pathLocal + file + "-" + parameter.fecha + ".log";
                            pathGzIn = pathLocal + file + "-" + parameter.fecha + ".log";
                            pathGzOut = pathGzIn
                        } else {
                            res.write(`data: ${JSON.stringify({ type: 'progress', message: err })}\n\n`);
                        }
                    }
                    await sftp.fastGet(pathRemoto, fileLocal, {
                        concurrency: 64, // número de bloques simultáneos 
                        chunkSize: 32768 // tamaño de cada bloque en bytes 
                    });
                    
                    // Descomprimir usando pipeline
                    if(pathGzIn.includes(".gz")) {
                        await pipe(
                            fs.createReadStream(pathGzIn),
                            zlib.createGunzip(),
                            fs.createWriteStream(pathGzOut)
                        );
                    }
                } else {
                    pathRemoto = parameter.dirRemoto + instance + file + ".log";
                    res.write(`data: ${JSON.stringify({ type: 'progress', message: `Inicio la descarga de ${file}.log` })}\n\n`);
                    await sftp.fastGet(pathRemoto, pathLocal + file + ".log", {
                        concurrency: 64, // número de bloques simultáneos 
                        chunkSize: 32768 // tamaño de cada bloque en bytes 
                    });
                    //console.log("pathRemoto" , parameter.dirRemoto+instance+file+".log");
                }
                //res.write(`data: ${JSON.stringify({type: 'progress',message: `Descarga completa`})}\n\n`);
                //console.log("pathLocal", "C:/Users/e10517a/Documents/NetBeansProjects/DescargarSeo"+parameter.dirLocal+instance);
            }

        }
        await sftp.end();
        res.write(`data: ${JSON.stringify({ type: 'progress', message: 'Conexion cerrada...' })}\n\n`);
        //console.log('🔌 Conexión cerrada');
        return true;
    } catch (err) {
        //console.error('Error en conexión SFTP:', err);
        throw err;
    }
}

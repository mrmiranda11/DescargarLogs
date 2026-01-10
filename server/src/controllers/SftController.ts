import { Request,Response } from "express";
import { connectSftpDemo, testSftp } from '../services/SftpService'
import { setConfig, getConfig,getUsername,getPassword } from "../util/config";

import dotenv from 'dotenv'

dotenv.config();

interface Parameter { port: number; username?: string; password?: string; dirRemoto?: string; instancias: string[]; files: string[]; }

export class SftpController{

    testSftp = async (req: Request, res:Response) =>{
        const { usuario, contrasena } = req.body;
        var parameter: Parameter={
            port: Number(process.env['sftp.server.port']),
            username: usuario,
            password: contrasena,
            dirRemoto: process.env['sftp.server.remote'],
            instancias: [],
            files: []
        };
        
        try {
            //debugger;
            await testSftp({...parameter, host:process.env['sftp.server1.host'],dirLocal: process.env['sftp.local.dir1']});
            setConfig({username:usuario,password:contrasena});
            return res.status(200).json({code:200,message:"Conexion Exitosa"})
        } catch (error) {
            const err = error as Error;
            return res.status(500).json({code:500,error:err.message});
            
        }
    }

    downloadSftp = async (req: Request, res:Response) =>{

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        var parameter: Parameter={
            port: Number(process.env['sftp.server.port']),
            username: getUsername(),
            password: getPassword(),
            dirRemoto: process.env['sftp.server.remote'],
            //instancias:[process.env['sftp.server.instance1'],process.env['sftp.server.instance2'],process.env['sftp.server.instance3']],
            instancias: [],
            files: process.env['sftp.server.files']?.split(',') || []
        };
        try {
            const { selectedOption, checkboxesFile ,checkboxesInstance, downloadByDate, selectedDate } = req.body;
            
            // Recorres las propiedades y agregas las que sean true
            // Inicializas instancias como array vacío
            if (checkboxesInstance.instanceF && process.env['sftp.server.instance1']) { 
                parameter.instancias.push(process.env['sftp.server.instance1']); 
            }
            if (checkboxesInstance.instanceG && process.env['sftp.server.instance2']) { 
                parameter.instancias.push(process.env['sftp.server.instance2']); 
            } 
            if (checkboxesInstance.instanceH && process.env['sftp.server.instance3']) {
                parameter.instancias.push(process.env['sftp.server.instance3']); 
            }


            if (!checkboxesFile.seo) { 
                parameter.files = parameter.files.filter(f => f !== "SEO_DICTUM"); 
            }
            if (!checkboxesFile.decisorws) { 
                parameter.files = parameter.files.filter(f => f !== "DecisorWS" && f !== "DecisorWS2"); 
            } 
            if (!checkboxesFile.karws) { 
                parameter.files = parameter.files.filter(f => f !== "KARWS" && f !== "KARWS2"); 
            }

            if(selectedOption=="DEMO"){
                //debugger;
                await connectSftpDemo({...parameter, host:process.env['sftp.server1.host'],dirLocal: process.env['sftp.local.dir1']},req,res);
                // Enviar actualización: conectando
                await connectSftpDemo({...parameter, host:process.env['sftp.server2.host'],dirLocal: process.env['sftp.local.dir2']},req,res);
            }else{
                
                await connectSftpDemo({...parameter, host:process.env['sftp.server3.host'],dirLocal: process.env['sftp.local.dir3']},req,res);

                await connectSftpDemo({...parameter, host:process.env['sftp.server4.host'],dirLocal: process.env['sftp.local.dir4']},req,res);
            }
            //return res.status(200).json({message:"Proceso programado"})
            return res.end();
        } catch (error) {
            const err = error as Error;
            if (err.message.includes("Authentication failed") || 
                err.message.includes("All configured authentication methods failed") 
            ){
                return res.status(200).json({code:255,message:err.message});
            }else{
                return res.status(500).json({code:500,error:err.message});
            }
            
        }
    }
}
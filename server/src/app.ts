import express from 'express';
import SftpRoutes from './routes/SftpRoutes';
import cors from 'cors';

import { connectSftpDemo } from './services/SftpService';
import { connectSftpProd } from './services/SftpService';

const allowedOrigins=[
    'http://localhost:5173'
];

//import dotenv from 'dotenv'

//dotenv.config();



/*var parameter = {
    host: process.env['sftp.server1.host'],
    port: Number(process.env['sftp.server.port']),
    username: process.env['sftp.server.user'],
    password: process.env['sftp.server.password'],
    dirRemoto: process.env['sftp.server.remote'],
    dirLocal: process.env['sftp.local.dir1'],
};

connectSftpDemo(parameter);

var parameter = {
    host: process.env['sftp.server2.host'],
    port: Number(process.env['sftp.server.port']),
    username: process.env['sftp.server.user'],
    password: process.env['sftp.server.password'],
    dirRemoto: process.env['sftp.server.remote'],
    dirLocal: process.env['sftp.local.dir2'],
};

connectSftpDemo(parameter);*/

/*console.log("HOST:::>"+config.host);



config = {
    host: process.env['sftp.server2.host'],
    port: Number(process.env['sftp.server.port']),
    username: process.env['sftp.server.user'],
    password: process.env['sftp.server.password'], // o usa privateKey si es por clave SSH
    // privateKey: require('fs').readFileSync('/ruta/a/tu/clave.pem')
};

connectSftpDemo(config);*/
const app = express();

app.use(express.json({limit:'10mb'}));
app.use(express.urlencoded({ extended: true }));

app.use(cors({origin:allowedOrigins,credentials: true}));
app.use('/',SftpRoutes);


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
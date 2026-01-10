import { Router,Request,Response } from "express";
import { SftpController } from "../controllers/SftController";


const router = Router();
const sftpController = new SftpController();

router.get('/get', async (req, res) => {
  try {
    res.status(200).json({ error: "200" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });

  }
});

router.post('/sftp',async (req: Request,res:Response)=>{
    await sftpController.downloadSftp(req,res);
})

router.post('/test',async (req: Request,res:Response)=>{
    //debugger;
    await sftpController.testSftp(req,res);
})


export default router;
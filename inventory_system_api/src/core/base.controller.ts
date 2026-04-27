import { Request, Response } from "express";

export abstract class BaseController 
{
    protected ok(res: Response, data: any ) 
    {
        res.status(200).json(data); 
    }


    protected created(res: Response, data: any ) 
    {
        res.status(201).json(data); 
    }   

    protected fail(res: Response, error: any ) 
    {
        res.status(400).json({ error});
    }
}
import { Request, Response } from 'express';
export declare const listDoctorRequests: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const approveDoctorRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const listAllUsers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const _default: {
    listDoctorRequests: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    approveDoctorRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    listAllUsers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
};
export default _default;
//# sourceMappingURL=adminController.d.ts.map
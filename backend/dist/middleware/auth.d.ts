import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../types';
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const roleMiddleware: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map
import { Request, Response, NextFunction } from 'express';

interface ParseableSchema {
    parseAsync: (val: unknown) => Promise<unknown>;
}

export const validate = (schema: ParseableSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            next(error);
        }
    };
};

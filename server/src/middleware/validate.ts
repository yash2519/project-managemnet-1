import { Request, Response, NextFunction } from "express";

/**
 * Creates a middleware that checks if a specified request parameter is a valid number.
 * If invalid, it immediately responds with a 400 Bad Request.
 * Otherwise, it passes control to the next middleware/controller.
 * 
 * @param paramName The name of the parameter in req.params to validate (e.g., 'projectId')
 */
export const validateIdParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    
    // Check if undefined or empty
    if (value === undefined || value === null || value.trim() === '') {
      res.status(400).json({ message: `Missing required parameter: ${paramName}` });
      return;
    }

    const num = Number(value);
    
    if (isNaN(num) || !Number.isInteger(num)) {
      res.status(400).json({ message: `Invalid parameter: ${paramName} must be a valid integer ID` });
      return;
    }

    // Attach parsed ID to res.locals for convenient typed access in controllers
    // res.locals[`${paramName}Parsed`] = num; 
    
    next();
  };
};

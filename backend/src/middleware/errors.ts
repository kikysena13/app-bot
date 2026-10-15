import type { ErrorRequestHandler, RequestHandler } from "express";

export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found" } });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error("Unhandled API error:", error);
  response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
};

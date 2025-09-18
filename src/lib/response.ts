import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CustomError } from "./errors";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown[];
}

export function successResponse<T>(data: T, message: string = "Success", status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function errorResponse(error: unknown): NextResponse<ApiResponse<null>> {
  if (error instanceof ZodError) {
    return NextResponse.json({ success: false, message: "Validation Error", errors: error.issues }, { status: 400 });
  }

  if (error instanceof CustomError) {
    return NextResponse.json({ success: false, message: error.message, errors: error.errors.length > 0 ? error.errors : undefined }, { status: error.statusCode });
  }

  console.error("Unhandled API Error:", error);
  return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
}

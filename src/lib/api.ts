// Shared API helpers for BAYWASH Group manager workspace routes.
import { NextResponse } from "next/server";

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status });

export const err = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function parseBody<T = Record<string, unknown>>(
  req: Request,
): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

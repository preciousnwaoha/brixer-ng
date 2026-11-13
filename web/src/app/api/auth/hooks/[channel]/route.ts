import { handleAuthHook } from "@/lib/auth-hooks";
export async function POST(request: Request, { params }: { params: Promise<{ channel: string }> }) { return handleAuthHook(request, (await params).channel); }

export const maxDuration = 60;

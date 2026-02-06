import { auth } from "@/lib/better-auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

function providerFromPath(pathname: string) {
	const parts = pathname.split("/").filter(Boolean);
	const idx = parts.indexOf("authorize");
	if (idx >= 0 && parts.length > idx + 1) return parts[idx + 1];
	return null;
}

async function checkProviderConfig(provider: string | null) {
	if (!provider) return true;
	if (provider === "google") {
		if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
			return {
				ok: false,
				message:
					"Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env",
			};
		}
	}
	if (provider === "github") {
		if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
			return {
				ok: false,
				message:
					"GitHub OAuth not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to your .env",
			};
		}
	}
	return { ok: true };
}

export const GET = async (request: Request) => {
	const url = new URL(request.url);
	const provider = providerFromPath(url.pathname);
	const check = await checkProviderConfig(provider);
	if (check.ok === false) {
		return new Response(check.message, { status: 400 });
	}
	if (handler.GET) return handler.GET(request);
	return new Response(null, { status: 405 });
};

export const POST = async (request: Request) => {
	const url = new URL(request.url);
	const provider = providerFromPath(url.pathname);
	const check = await checkProviderConfig(provider);
	if (check.ok === false) {
		return new Response(check.message, { status: 400 });
	}
	if (handler.POST) return handler.POST(request);
	return new Response(null, { status: 405 });
};

import { NextRequest, NextResponse } from "next/server";

type SupportBody = { name?: unknown; email?: unknown; category?: unknown; message?: unknown; website?: unknown };
type RateState = { count: number; resetAt: number };
const rateState = new Map<string, RateState>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_MESSAGES = 5;

function cleanText(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function escapeHtml(value: string) { return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function requestKey(request: NextRequest) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"; }
function allowMessage(key: string) { const now=Date.now(); const current=rateState.get(key); if(!current||current.resetAt<=now){rateState.set(key,{count:1,resetAt:now+WINDOW_MS}); return true;} if(current.count>=MAX_MESSAGES)return false; current.count+=1; rateState.set(key,current); return true; }

export async function POST(request: NextRequest) {
  const origin=request.headers.get("origin");
  if(origin && origin !== new URL(request.url).origin) return NextResponse.json({ok:false,message:"This request could not be verified."},{status:403});
  let body: SupportBody;
  try { body = (await request.json()) as SupportBody; } catch { return NextResponse.json({ok:false,message:"Venture could not read that message."},{status:400}); }
  if(cleanText(body.website,180)) return NextResponse.json({ok:true,message:"Your message went through."});
  const name=cleanText(body.name,80); const email=cleanText(body.email,180).toLowerCase(); const category=cleanText(body.category,80)||"General help"; const message=cleanText(body.message,4000);
  if(!validEmail(email)) return NextResponse.json({ok:false,message:"Enter a valid email address."},{status:400});
  if(message.length<8) return NextResponse.json({ok:false,message:"Add a little more detail so Venture can help."},{status:400});
  if(!allowMessage(requestKey(request))) return NextResponse.json({ok:false,message:"Too many messages were sent recently. Try again in a few minutes."},{status:429});
  const resendKey=process.env.RESEND_API_KEY;
  if(!resendKey) return NextResponse.json({ok:false,message:"Venture support email is temporarily unavailable."},{status:503});
  const from=process.env.VENTURE_EMAIL_FROM ?? "Venture by Boogie Bangers <venture@updates.boogiebangers.com>";
  const supportTo=process.env.VENTURE_SUPPORT_TO ?? process.env.VENTURE_EMAIL_REPLY_TO ?? "venturebangers@gmail.com";
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${resendKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[supportTo],reply_to:email,subject:`[Venture Support] ${category}`,text:["New Venture support message","",`Category: ${category}`,`Name: ${name || "Not provided"}`,`Email: ${email}`,"",message].join("\n"),html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px;color:#0b2b50"><p style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#dc2f3b">VENTURE SUPPORT</p><h1 style="font-size:24px;margin:0 0 18px">New support message</h1><p><strong>Category:</strong> ${escapeHtml(category)}</p><p><strong>Name:</strong> ${escapeHtml(name||"Venture user")}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><div style="margin-top:20px;padding:16px;border:1px solid #d6e0e8;border-radius:14px;background:#fffaf5;line-height:1.55">${escapeHtml(message).replaceAll("\n","<br />")}</div></div>`})});
  if(!response.ok){console.error("Venture support email failed",response.status); return NextResponse.json({ok:false,message:"Venture could not send your message right now. Please try again."},{status:502});}
  return NextResponse.json({ok:true,message:"Sent. Venture has your message."});
}

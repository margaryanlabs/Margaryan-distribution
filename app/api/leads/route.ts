import {NextResponse} from "next/server";
import {distributionStore} from "@/lib/store";

export function GET(){return NextResponse.json({leads:distributionStore.listLeads()});}

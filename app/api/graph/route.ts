import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const repoName = searchParams.get('repoName');

    if (!repoName) {
        return NextResponse.json({ error: "Missing repoName parameter" }, { status: 400 });
    }

    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('repositories')
            .select('graph_data')
            .eq('name', repoName)
            .eq('user_id', user.id)
            .single();

        if (error || !data || !data.graph_data) {
            return NextResponse.json({ error: "Graph data not found. The repository may not be fully indexed yet." }, { status: 404 });
        }

        const rawData = data.graph_data as any;
        const graph = rawData.nodes ? rawData.nodes : rawData;
        const commits = rawData.commits ? rawData.commits : [];

        return NextResponse.json({ graph, commits }, { status: 200 });
    } catch (e) {
        console.error("Error reading graph data:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


                                                                                                                                                    

import { createClient } from './supabase/server'

export interface RepoMetadata {
    id?: string;
    name: string;
    url: string;
    collection: string;
    createdAt: string;
    indexedAt?: string;
    status?: string;
    progress?: number;
    progressMessage?: string;
    errorMessage?: string;
}

async function getUserId() {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error("Unauthorized")
    return user.id
}

export async function getAllRepos(): Promise<RepoMetadata[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('repositories').select('*').order('created_at', { ascending: false })
    if (error) {
        console.error("Error fetching repos:", error)
        return []
    }
    return data.map(r => ({
        id: r.id,
        name: r.name,
        url: r.url,
        collection: r.collection,
        createdAt: r.created_at,
        indexedAt: r.indexed_at,
        status: r.status,
        progress: r.progress,
        progressMessage: r.progress_message,
        errorMessage: r.error_message
    }))
}

export async function addRepo(repo: RepoMetadata): Promise<void> {
    const supabase = createClient()
    const userId = await getUserId()

    const { error } = await supabase.from('repositories').insert({
        user_id: userId,
        name: repo.name,
        url: repo.url,
        collection: repo.collection,
        created_at: repo.createdAt,
        indexed_at: repo.indexedAt,
        status: repo.status || 'pending',
        progress: repo.progress || 0,
        progress_message: repo.progressMessage || ''
    })

    if (error) {
        throw new Error(`Failed to add repo: ${error.message}`)
    }
}

type RepoUpdatePayload = {
    url?: string;
    collection?: string;
    indexed_at?: string;
    status?: string;
    progress?: number;
    progress_message?: string;
    error_message?: string;
};

export async function updateRepo(name: string, patch: Partial<RepoMetadata>): Promise<void> {
    const supabase = createClient()
    const userId = await getUserId()

    const updateData: RepoUpdatePayload = {}
    if (patch.url) updateData.url = patch.url
    if (patch.collection) updateData.collection = patch.collection
    if (patch.indexedAt) updateData.indexed_at = patch.indexedAt
    if (patch.status !== undefined) updateData.status = patch.status
    if (patch.progress !== undefined) updateData.progress = patch.progress
    if (patch.progressMessage !== undefined) updateData.progress_message = patch.progressMessage
    if (patch.errorMessage !== undefined) updateData.error_message = patch.errorMessage

    const { error } = await supabase
        .from('repositories')
        .update(updateData)
        .eq('name', name)
        .eq('user_id', userId)

    if (error) {
        throw new Error(`Failed to update repo: ${error.message}`)
    }
}

export async function deleteRepo(name: string): Promise<void> {
    const supabase = createClient()
    const userId = await getUserId()

    const { error } = await supabase
        .from('repositories')
        .delete()
        .eq('name', name)
        .eq('user_id', userId)

    if (error) {
        throw new Error(`Failed to delete repo: ${error.message}`)
    }
}

export async function getRepoByName(name: string): Promise<RepoMetadata | undefined> {
    const supabase = createClient()
    const userId = await getUserId()

    const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .eq('name', name)
        .eq('user_id', userId)
        .single()

    if (error || !data) return undefined

    return {
        id: data.id,
        name: data.name,
        url: data.url,
        collection: data.collection,
        createdAt: data.created_at,
        indexedAt: data.indexed_at,
        status: data.status,
        progress: data.progress,
        progressMessage: data.progress_message,
        errorMessage: data.error_message
    }
}

export async function repoExists(name: string): Promise<boolean> {
    const repo = await getRepoByName(name)
    return !!repo
}



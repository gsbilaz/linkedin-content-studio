const LI_VERSION = '202505'
const BASE = 'https://api.linkedin.com'

function liHeaders(token: string, extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': LI_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
    ...extra,
  }
}

export interface LinkedInProfile {
  linkedinId: string
  name: string
  picture: string | null
}

export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const res = await fetch(`${BASE}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LinkedIn userinfo failed (${res.status}): ${body}`)
  }

  const userinfo = await res.json()

  // `sub` is the member ID in the OpenID Connect flow — used as the posting URN
  return {
    linkedinId: userinfo.sub as string,
    name: (userinfo.name as string) ?? '',
    picture: (userinfo.picture as string) ?? null,
  }
}

export async function initImageUpload(
  token: string,
  ownerUrn: string
): Promise<{ uploadUrl: string; imageUrn: string }> {
  const res = await fetch(`${BASE}/rest/images?action=initializeUpload`, {
    method: 'POST',
    headers: liHeaders(token),
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LinkedIn image upload init failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  return {
    uploadUrl: data.value.uploadUrl as string,
    imageUrn: data.value.image as string,
  }
}

export async function initDocumentUpload(
  token: string,
  ownerUrn: string
): Promise<{ uploadUrl: string; documentUrn: string }> {
  const res = await fetch(`${BASE}/rest/documents?action=initializeUpload`, {
    method: 'POST',
    headers: liHeaders(token),
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LinkedIn document upload init failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  return {
    uploadUrl: data.value.uploadUrl as string,
    documentUrn: data.value.document as string,
  }
}

export async function uploadBinary(
  uploadUrl: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: new Uint8Array(buffer),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Binary upload to LinkedIn failed (${res.status}): ${err}`)
  }
}

export interface PostMediaParam {
  type: 'single_image' | 'multi_image' | 'document'
  urns: string[]
  title?: string
}

export async function createLinkedInPost(
  token: string,
  ownerUrn: string,
  commentary: string,
  media?: PostMediaParam
): Promise<string> {
  const body: Record<string, unknown> = {
    author: ownerUrn,
    commentary,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }

  if (media) {
    if (media.type === 'multi_image') {
      body.content = {
        multiImage: {
          images: media.urns.map((id) => ({ id, altText: '' })),
        },
      }
    } else if (media.type === 'single_image') {
      body.content = { media: { id: media.urns[0] } }
    } else if (media.type === 'document') {
      body.content = {
        media: { id: media.urns[0], title: media.title ?? 'Document' },
      }
    }
  }

  const res = await fetch(`${BASE}/rest/posts`, {
    method: 'POST',
    headers: liHeaders(token),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LinkedIn post creation failed (${res.status}): ${err}`)
  }

  return res.headers.get('x-restli-id') ?? res.headers.get('X-RestLi-Id') ?? ''
}

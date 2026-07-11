import { NextResponse } from "next/server"

const UPSTREAM =
  "http://51.77.216.195/crapi/lamix/viewstats?token=aXZ0gVZXgoCAc2loX4iFSl9mVWB8hVdgdFVhW3SVZXM=&records=50"

export async function GET() {
  try {
    const res = await fetch(UPSTREAM, {
      next: { revalidate: 0 },
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error", status: res.status }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}

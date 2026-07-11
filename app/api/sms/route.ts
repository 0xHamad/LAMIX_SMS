export async function GET() {
  try {
    const response = await fetch(
      'http://51.77.216.195/crapi/lamix/viewstats?token=aXZ0gVZXgoCAc2loX4iFSl9mVWB8hVdgdFVhW3SVZXM=&records=50'
    )

    if (!response.ok) {
      return Response.json(
        {
          total_sms: 0,
          unique_countries: 0,
          active_cli: 0,
          total_payout: 0,
          data: [],
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error('SMS API error:', error)
    return Response.json(
      {
        total_sms: 0,
        unique_countries: 0,
        active_cli: 0,
        total_payout: 0,
        data: [],
      },
      { status: 200 }
    )
  }
}

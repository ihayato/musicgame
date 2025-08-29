import { get } from '@vercel/edge-config';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get play counts from Edge Config (read-only, ultra-fast)
      const counts = await get('playCounts') || {};
      return res.status(200).json(counts);
    }
    
    // Edge Config is read-only, so no POST method for real updates
    // Updates would be done via Vercel API or dashboard
    if (req.method === 'POST') {
      const { songId } = req.body;
      console.log(`Play count increment requested for: ${songId}`);
      
      // For now, just log the play event
      // In production, this could trigger a webhook to update Edge Config
      return res.status(200).json({ 
        songId, 
        success: true, 
        message: 'Play event logged (Edge Config updates via dashboard)' 
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Play count error:', error);
    
    // If Edge Config is not configured, return mock data for development
    if (error.message?.includes('edge-config') || error.message?.includes('EDGE_CONFIG')) {
      console.warn('Vercel Edge Config not configured, returning mock data');
      
      if (req.method === 'GET') {
        return res.status(200).json({
          'cryinggirl': 127,
          'akunohana': 89,
          'kuroneko': 45,
          'hatsukoi': 156,
          'es': 34,
          'giocconda': 67,
          'snails': 23
        });
      }
      
      if (req.method === 'POST') {
        return res.status(200).json({ 
          songId: req.body.songId, 
          count: Math.floor(Math.random() * 200),
          success: true,
          mock: true 
        });
      }
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
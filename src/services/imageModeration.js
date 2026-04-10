export async function moderateImage(base64Image, mimeType) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Image
            }
          },
          {
            type: 'text',
            text: `You are a content moderator for a Christian Bible study app called AbidingAnchor. 
            Analyze this image and determine if it is appropriate for a Christian ministry app.
            
            REJECT the image if it contains ANY of the following:
            - Nudity or sexual content
            - Demonic, satanic, or occult imagery
            - Racist or hateful symbols or content
            - Graphic violence or gore
            - Drug or alcohol promotion
            - Offensive gestures
            - Anything that goes against Christian values
            
            APPROVE the image if it is:
            - A normal person/selfie photo
            - A landscape or nature photo
            - An appropriate artistic image
            - A Christian symbol used respectfully
            - Any wholesome appropriate content
            
            Respond with ONLY a JSON object, nothing else:
            {
              "approved": true or false,
              "reason": "brief reason if rejected, empty string if approved"
            }`
          }
        ]
      }]
    })
  });
  
  const data = await response.json();
  const text = data.content[0].text;
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

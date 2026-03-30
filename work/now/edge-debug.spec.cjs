const { test } = require('@playwright/test');

test('inspect edges', async ({ page }) => {
  await page.goto('https://clash.solofarm.ru', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const data = await page.evaluate(() => {
    const edges = [...document.querySelectorAll('.react-flow__edge')].map((edge) => ({
      className: String(edge.className),
      html: edge.outerHTML.slice(0, 300)
    }));

    const paths = [...document.querySelectorAll('.react-flow__edge path')].map((path) => ({
      d: path.getAttribute('d'),
      style: path.getAttribute('style'),
      stroke: path.getAttribute('stroke')
    }));

    return {
      edgeCount: edges.length,
      pathCount: paths.length,
      viewport: document.querySelector('.react-flow__viewport')?.getAttribute('style'),
      renderer: document.querySelector('.react-flow__renderer')?.getAttribute('style'),
      sampleEdges: edges.slice(0, 3),
      samplePaths: paths.slice(0, 3)
    };
  });

  console.log(JSON.stringify(data, null, 2));
});

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CHROMIUM_PATH =
  "https://vomrghiulbmrfvmhlflk.supabase.co/storage/v1/object/public/chromium-pack/chromium-v123.0.0-pack.tar";

async function getBrowser() {
  if (process.env.VERCEL_ENV === "production") {
    const chromium = await import("@sparticuz/chromium-min").then(
      (mod) => mod.default
    );

    const puppeteerCore = await import("puppeteer-core").then(
      (mod) => mod.default
    );

    const executablePath = await chromium.executablePath(CHROMIUM_PATH);

    const browser = await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: {
        width: 1200, // Default values
        height: 800, // Default values
      },
      executablePath,
      headless: chromium.headless,
    });
    return browser;
  } else {
    const puppeteer = await import("puppeteer").then((mod) => mod.default);

    const browser = await puppeteer.launch();
    return browser;
  }
}

export async function POST(request) {
  // Parse the incoming JSON body
  const body = await request.json();

  const { url, width, height } = body; // Destructure URL, width, and height from request body

  // Ensure default values are set if not provided in the request
  const pageWidth = width || 1200;
  const pageHeight = height || 800;

  try {
    const browser = await getBrowser();

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Handle scrolling on the page
    await page.evaluate(() => {
      let totalHeight = 0;
      const distance = 100;
      const scrollHeight = document.body.scrollHeight;

      const scroll = () => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight < scrollHeight) {
          setTimeout(scroll, 100);
        }
      };

      scroll();
    });

    // Capture the screenshot as a base64 string
    const screenshotBase64 = await page.screenshot({ fullPage: true, encoding: 'base64' });

    console.log('Screenshot taken', screenshotBase64.length);

    await browser.close();

    return new NextResponse(screenshotBase64);
  } catch (error) {
    console.error('Error taking screenshot:', error);
    return new NextResponse('Failed to take screenshot', { status: 500 });
  }
}

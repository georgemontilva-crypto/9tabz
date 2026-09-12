/**
 * Seeds the 9M-Krea Complex line: five flavours and the California COA that
 * goes with each.
 *
 * Idempotent and additive. A product whose slug already exists is left exactly
 * as it is, and a report whose URL is already on file is not inserted again, so
 * running this against a database the client has already edited cannot undo
 * their work. Run it as many times as you like:
 *
 *   DATABASE_URL="…" pnpm seed
 *
 * The COA PDFs are linked where they already live rather than copied into R2:
 * the same file in two places is one more thing to keep in step when a batch is
 * retested.
 */
import "dotenv/config";
import * as db from "./db";

const COLLECTION = "9 M-KREA™ COMPLEX";
const SUBTITLE = "4x TABS 100 MG/TAB – Botanical Extract";
const DESCRIPTION =
  "9M-Krea Complex — Botanical Extract Tablets. 100mg per tablet, 4x chewable tablets, 15 minute rapid release formula. Max potency, advanced users only.";

type Seed = {
  slug: string;
  name: string;
  image: string;
  batch: string;
  coa: string;
};

const PRODUCTS: Seed[] = [
  {
    slug: "9-m-krea-complex-berry",
    name: "Berry",
    image: "/products/berry.webp",
    batch: "SD260813-067",
    coa: "https://get9tabz.com/wp-content/uploads/2026/08/SD260813-067_9Tabz-9m-KREA-BERRY_California_COA_V1.pdf",
  },
  {
    slug: "9-m-krea-complex-blue-razz",
    name: "Blue Razz",
    image: "/products/blue-razz.webp",
    batch: "SD260813-068",
    coa: "https://get9tabz.com/wp-content/uploads/2026/08/SD260813-068_9Tabz-9m-KREA-BLUERAZZ_California_COA_V1.pdf",
  },
  {
    slug: "9-m-krea-complex-cherry",
    name: "Cherry",
    image: "/products/cherry.webp",
    batch: "SD260813-069",
    coa: "https://get9tabz.com/wp-content/uploads/2026/08/SD260813-069_9Tabz-9m-KREA-CHERRY_California_COA_V1.pdf",
  },
  {
    slug: "9-m-krea-complex-unflavored",
    name: "Unflavored",
    image: "/products/unflavored.webp",
    batch: "SD260813-070",
    coa: "https://get9tabz.com/wp-content/uploads/2026/08/SD260813-070_9Tabz-9m-KREA-UNFLAVORED_California_COA_V1-1.pdf",
  },
  {
    slug: "9-m-krea-complex-watermelon",
    name: "Watermelon",
    image: "/products/watermelon.webp",
    batch: "SD260813-071",
    coa: "https://get9tabz.com/wp-content/uploads/2026/08/SD260813-071_9Tabz-9m-KREA-WATERMELON_California_COA_V1.pdf",
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  let createdProducts = 0;
  let createdReports = 0;

  for (let index = 0; index < PRODUCTS.length; index++) {
    const seed = PRODUCTS[index];
    let product = await db.getProductBySlug(seed.slug);

    if (!product) {
      await db.createProduct({
        slug: seed.slug,
        name: seed.name,
        collection: COLLECTION,
        subtitle: SUBTITLE,
        description: DESCRIPTION,
        imageUrl: seed.image,
        imageKey: null,
        sortOrder: index,
        published: true,
      });
      product = await db.getProductBySlug(seed.slug);
      createdProducts++;
      console.log(`+ product  ${seed.name}`);
    } else {
      console.log(`= product  ${seed.name} (already present, left alone)`);
    }

    if (!product) {
      console.error(`  could not read back ${seed.slug}, skipping its report`);
      continue;
    }

    const existing = await db.listLabReports(product.id);
    if (existing.some((r) => r.fileUrl === seed.coa)) {
      console.log(`= report   ${seed.batch} (already present)`);
      continue;
    }

    await db.createLabReport({
      productId: product.id,
      title: `California COA — Batch ${seed.batch}`,
      batch: seed.batch,
      lab: null,
      testedOn: null,
      fileUrl: seed.coa,
      fileKey: "",
      fileName: seed.coa.split("/").pop() ?? null,
      sizeBytes: null,
      sortOrder: 0,
      published: true,
    });
    createdReports++;
    console.log(`+ report   ${seed.batch}`);
  }

  console.log(
    `\nDone. ${createdProducts} product(s) and ${createdReports} report(s) added.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

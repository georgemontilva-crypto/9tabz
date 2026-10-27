/**
 * Seeds the 9M-Krea Complex line: five flavours and the California COA that
 * goes with each.
 *
 * Idempotent and additive. A product whose slug already exists is left exactly
 * as it is, and a report whose URL is already on file is not inserted again, so
 * running this against a database the client has already edited cannot undo
 * their work. Run it as many times as you like, either way:
 *
 *   DATABASE_URL="…" pnpm seed          (from a machine that can reach the DB)
 *   SEED_CATALOG=true                    (set on the server; runs once at boot)
 *
 * The COA PDFs are linked where they already live rather than copied into R2:
 * the same file in two places is one more thing to keep in step when a batch is
 * retested.
 */
import "dotenv/config";
import * as db from "./db";

const COLLECTION = "9 M-KREA™ COMPLEX";
const SUBTITLE = "4x TABS 100 MG/TAB – Botanical Extract";

/**
 * The catalogue entry every authentication code points at.
 *
 * The code printed under the scratch label doesn't encode a flavour, so the
 * verification result can only honestly name what all of them share. It carries
 * no lab reports of its own and so never appears on the reports page, which
 * lists per-flavour COAs.
 */
const VERIFICATION_PRODUCT = {
  slug: "4x-tabs-100-mg-tab-botanical-extract",
  name: "4x TABS 100 MG/TAB – Botanical Extract",
};
const DESCRIPTION =
  "9M-Krea Complex — Botanical Extract Tablets. 100mg per tablet, 4x chewable tablets, 15 minute rapid release formula. Max potency, advanced users only.";

type Report = {
  /** Who ran it. This is what the public card labels the link with. */
  lab: string;
  batch: string;
  /** YYYY-MM-DD, or null when the COA doesn't state it. */
  testedOn: string | null;
  url: string;
};

type Seed = {
  slug: string;
  name: string;
  image: string;
  reports: Report[];
};

/**
 * Both rounds of testing, per flavour.
 *
 * A newer COA does not retire the one before it: a unit bought last month was
 * tested under the older batch, and pulling that report would leave whoever is
 * holding it unable to check what they actually have. So reports accumulate and
 * the card lists them side by side, labelled by lab.
 *
 * The SD Pharmlab round is hosted on the WordPress site and linked; the NN
 * Analytics round ships with the repo under client/public/lab-reports, which is
 * why those URLs are site-relative.
 */
const PRODUCTS: Seed[] = [
  {
    slug: "9-m-krea-complex-berry",
    name: "Berry",
    image: "/products/berry.webp",
    reports: [
      {
        lab: "SD Pharmlab",
        batch: "SD260813-067",
        testedOn: null,
        url: "https://get9tabz.com/wp-content/uploads/2026/08/SD260813-067_9Tabz-9m-KREA-BERRY_California_COA_V1.pdf",
      },
      {
        lab: "NN Analytics",
        batch: "B260930-1",
        testedOn: "2026-09-30",
        url: "/lab-reports/nn-analytics-9t-berry-B260930-1.pdf",
      },
    ],
  },
  {
    slug: "9-m-krea-complex-blue-razz",
    name: "Blue Razz",
    image: "/products/blue-razz.webp",
    reports: [
      {
        lab: "SD Pharmlab",
        batch: "SD260813-068",
        testedOn: null,
        url: "https://get9tabz.com/wp-content/uploads/2026/08/SD260813-068_9Tabz-9m-KREA-BLUERAZZ_California_COA_V1.pdf",
      },
      {
        lab: "NN Analytics",
        batch: "B260930-1",
        testedOn: "2026-09-30",
        url: "/lab-reports/nn-analytics-9t-blue-razz-B260930-1.pdf",
      },
    ],
  },
  {
    slug: "9-m-krea-complex-cherry",
    name: "Cherry",
    image: "/products/cherry.webp",
    reports: [
      {
        lab: "SD Pharmlab",
        batch: "SD260813-069",
        testedOn: null,
        url: "https://get9tabz.com/wp-content/uploads/2026/08/SD260813-069_9Tabz-9m-KREA-CHERRY_California_COA_V1.pdf",
      },
      {
        lab: "NN Analytics",
        batch: "B260930-1",
        testedOn: "2026-09-30",
        url: "/lab-reports/nn-analytics-9t-cherry-B260930-1.pdf",
      },
    ],
  },
  {
    slug: "9-m-krea-complex-unflavored",
    name: "Unflavored",
    image: "/products/unflavored.webp",
    reports: [
      {
        lab: "SD Pharmlab",
        batch: "SD260813-070",
        testedOn: null,
        url: "https://get9tabz.com/wp-content/uploads/2026/08/SD260813-070_9Tabz-9m-KREA-UNFLAVORED_California_COA_V1-1.pdf",
      },
      {
        lab: "NN Analytics",
        batch: "B260930-1",
        testedOn: "2026-09-30",
        url: "/lab-reports/nn-analytics-9t-unflavored-B260930-1.pdf",
      },
    ],
  },
  {
    slug: "9-m-krea-complex-watermelon",
    name: "Watermelon",
    image: "/products/watermelon.webp",
    reports: [
      {
        lab: "SD Pharmlab",
        batch: "SD260813-071",
        testedOn: null,
        url: "https://get9tabz.com/wp-content/uploads/2026/08/SD260813-071_9Tabz-9m-KREA-WATERMELON_California_COA_V1.pdf",
      },
      {
        lab: "NN Analytics",
        batch: "B260930-1",
        testedOn: "2026-09-30",
        url: "/lab-reports/nn-analytics-9t-watermelon-B260930-1.pdf",
      },
    ],
  },
];
export async function seedCatalog(): Promise<void> {
  let createdProducts = 0;
  let createdReports = 0;

  if (!(await db.getProductBySlug(VERIFICATION_PRODUCT.slug))) {
    await db.createProduct({
      slug: VERIFICATION_PRODUCT.slug,
      name: VERIFICATION_PRODUCT.name,
      collection: null,
      subtitle: null,
      description: DESCRIPTION,
      imageUrl: null,
      imageKey: null,
      sortOrder: 99,
      published: true,
    });
    createdProducts++;
    console.log(`+ product  ${VERIFICATION_PRODUCT.name} (for code verification)`);
  } else {
    console.log(`= product  ${VERIFICATION_PRODUCT.name} (already present)`);
  }

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

    for (let order = 0; order < seed.reports.length; order++) {
      const report = seed.reports[order];
      const already = existing.find((r) => r.fileUrl === report.url);

      if (already) {
        // Earlier runs filed the SD round with no lab name, back when it was
        // the only one. Now that the card labels each link by lab, a blank one
        // would render as an unidentified second link.
        if (!already.lab) {
          await db.updateLabReport(already.id, { lab: report.lab, sortOrder: order });
          console.log(`~ report   ${report.lab} / ${report.batch} (labelled)`);
        } else {
          console.log(`= report   ${report.lab} / ${report.batch} (already present)`);
        }
        continue;
      }

      await db.createLabReport({
        productId: product.id,
        title: `${report.lab} COA — Batch ${report.batch}`,
        batch: report.batch,
        lab: report.lab,
        testedOn: report.testedOn,
        fileUrl: report.url,
        // No fileKey: these are either linked from the WordPress site or served
        // straight out of the repo, so there is no object of ours in the bucket.
        fileKey: "",
        fileName: report.url.split("/").pop() ?? null,
        sizeBytes: null,
        sortOrder: order,
        published: true,
      });
      createdReports++;
      console.log(`+ report   ${report.lab} / ${report.batch}`);
    }
  }

  console.log(
    `[Seed] Done. ${createdProducts} product(s) and ${createdReports} report(s) added.`
  );
}

/**
 * Boot hook. Gated on SEED_CATALOG so a redeploy doesn't silently re-run it
 * every time the container restarts; set the variable, wait for the deploy,
 * then remove it. A failure is logged and swallowed — the catalogue is content,
 * and the site should still come up and verify codes without it.
 */
export async function seedCatalogIfRequested(): Promise<void> {
  if (process.env.SEED_CATALOG !== "true") return;
  try {
    console.log("[Seed] SEED_CATALOG is set — loading the 9M-Krea catalogue…");
    await seedCatalog();
  } catch (err) {
    console.error("[Seed] FAILED — the site will start without it:", err);
  }
}

/** CLI entry point: `pnpm seed`. */
const isCli = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isCli) {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  seedCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}

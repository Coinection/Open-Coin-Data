import { join, dirname, basename, resolve } from "path";
import { readFileSync, writeFileSync, existsSync, readdirSync, Dirent } from "fs";

// Constants
const NEXT_YEAR = new Date().getFullYear() + 1;
const COUNTRIES_DIR = "Countries";
const DENOMINATIONS = ["001", "002", "005", "010", "020", "050", "100", "200"];

// Interfaces
interface SerieMetadata {
    id: string;
    countryId: string;
    startDate: string;
    endDate?: string;
    path: string;
}

interface CoinFile {
    path: string;
    id: string;
    countryId: string;
    serieId: string;
    denomination: string;
}

class MintageUpdater {
    private rootDir: string;
    private activeSeries: SerieMetadata[] = [];
    private coinFiles: CoinFile[] = [];

    constructor() {
        this.rootDir = resolve(__dirname, "..");
    }

    /**
     * Main function to update mintage data for ongoing coin series
     */
    async main(): Promise<void> {
        try {
            console.log("🚀 Starting mintage update process...");
            console.log(`📅 Target year: ${NEXT_YEAR}\n`);

            await this.discoverActiveSeries();
            await this.findCoinFiles();
             
            const coinsNeedingUpdates = await this.findCoinsNeedingUpdates();

            await this.addMintageRows(coinsNeedingUpdates);

            console.log("\n✅ Mintage update process completed successfully!");

        } catch (error) {
            console.error("❌ Error during mintage update process:", error);
            throw error;
        }
    }

    /**
     * Discover all active coin series (those without end dates)
     */
    private async discoverActiveSeries(): Promise<void> {
        const countriesPath = join(this.rootDir, COUNTRIES_DIR);

        if (!existsSync(countriesPath)) {
            console.warn(`🕵️ Countries directory not found at: ${countriesPath}`);
            return;
        }

        const countries = readdirSync(countriesPath, { withFileTypes: true })
            .filter((dirent: Dirent) => dirent.isDirectory())
            .map((dirent: Dirent) => dirent.name);

        for (const country of countries) {
            const countryPath = join(countriesPath, country);
            const years = readdirSync(countryPath, { withFileTypes: true })
                .filter((dirent: Dirent) => dirent.isDirectory() && /^\d{4}$/.test(dirent.name))
                .map((dirent: Dirent) => dirent.name);

            for (const year of years) {
                const serieIndexPath = join(countryPath, year, "index.md");
                if (existsSync(serieIndexPath)) {
                    const serieData = await this.parseSerieFile(serieIndexPath);
                    if (serieData && !serieData.endDate) {
                        this.activeSeries.push({
                            ...serieData,
                            path: serieIndexPath
                        });
                    }
                }
            }
        }
    }

    /**
     * Parse serie index.md file to extract metadata
     */
    private async parseSerieFile(filePath: string): Promise<SerieMetadata | null> {
        try {
            const content = readFileSync(filePath, "utf-8");
            const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

            if (!frontMatterMatch) return null;

            const frontMatter = frontMatterMatch[1];
            const id = this.extractFrontMatterValue(frontMatter, "id");
            const countryId = this.extractFrontMatterValue(frontMatter, "countryId");

            // Extract start and end dates from content
            const startDateMatch = content.match(/\*\*Startdate:\*\*\s*([^\\\n]+)/);
            const endDateMatch = content.match(/\*\*Enddate:\*\*\s*([^\\\n]*)/);

            const startDate = startDateMatch ? startDateMatch[1].trim() : "";
            let endDate: string | undefined = undefined;

            if (endDateMatch) {
                const endDateValue = endDateMatch[1].trim();
                // Only set endDate if it"s not empty and doesn"t start with ## (which would be the next header)
                if (endDateValue && !endDateValue.startsWith("##")) {
                    endDate = endDateValue;
                }
            }

            if (!id || !countryId) return null;

            return {
                id,
                countryId,
                startDate,
                endDate,
                path: filePath
            };
        } catch (error) {
            console.warn(`Warning: Could not parse serie file ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Extract value from front matter
     */
    private extractFrontMatterValue(frontMatter: string, key: string): string | null {
        const match = frontMatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
        return match ? match[1].trim() : null;
    }

    /**
     * Find all coin files in active series
     */
    private async findCoinFiles(): Promise<void> {
        for (const serie of this.activeSeries) {
            const serieDir = dirname(serie.path);

            for (const denomination of DENOMINATIONS) {
                const coinFilePath = join(serieDir, `${denomination}.md`);
                if (existsSync(coinFilePath)) {
                    this.coinFiles.push({
                        path: coinFilePath,
                        id: `${serie.countryId}-${basename(serieDir)}-${denomination}`,
                        countryId: serie.countryId,
                        serieId: serie.id,
                        denomination
                    });
                }
            }
        }
    }

    /**
     * Check if a coin file has a specific year in its mintage table
     */
    private async coinHasYear(filePath: string, year: number): Promise<boolean> {
        try {
            const content = readFileSync(filePath, "utf-8");
            const yearPattern = new RegExp(`^\\|\\s*${year}\\s*\\|`, "m");
            return yearPattern.test(content);
        } catch (error) {
            console.warn(`Warning: Could not check year in ${filePath}:`, error);
            return false;
        }
    }

    /**
     * Find coins that need 2026 mintage updates
     */
    private async findCoinsNeedingUpdates(): Promise<CoinFile[]> {
        const coinsNeedingUpdates: CoinFile[] = [];

        for (const coinFile of this.coinFiles) {
            const has2026 = await this.coinHasYear(coinFile.path, NEXT_YEAR);
            if (!has2026) {
                coinsNeedingUpdates.push(coinFile);
            }
        }

        console.log(`🕵️ Found ${coinsNeedingUpdates.length} coins needing ${NEXT_YEAR} updates`);
        return coinsNeedingUpdates;
    }

    /**
     * Add mintage rows to coins that need them (simple approach - just append a new row)
     */
    private async addMintageRows(coins: CoinFile[]): Promise<void> {
        let updatedCount = 0;

        for (const coin of coins) {
            try {
                await this.addMintageRowToCoin(coin);
                updatedCount++;
                if (updatedCount <= 5) { // Show first 5 updates
                }
            } catch (error) {
                console.error(`✗ Failed to update ${coin.path}:`, error);
            }
        }

        console.log(`\n📝 Updated ${updatedCount} coin files with ${NEXT_YEAR} mintage data`);
    }

    /**
     * Add mintage row(s) to a coin file, German coins need 5 rows (A, D, F, G, J)
     */
    private async addMintageRowToCoin(coin: CoinFile): Promise<void> {
        const content = readFileSync(coin.path, "utf-8");

        // Find the end of the mintage table (look for the last table row)
        const tableRowPattern = /^(\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|)$/gm;
        let lastMatch;
        let match;

        while ((match = tableRowPattern.exec(content)) !== null) {
            lastMatch = match;
        }

        if (!lastMatch) {
            throw new Error(`Could not find mintage table in ${coin.path}`);
        }

        // Create new rows - German coins need mint marks A, D, F, G, J
        let newRows: string;
        if (coin.countryId === "DE") {
            // German coins: add 5 rows with different mint marks
            const germanMintMarks = ["A", "D", "F", "G", "J"];
            const rows = germanMintMarks.map(mintMark =>
                `| ${NEXT_YEAR} | ${mintMark}        | 0          | 0                      | 0      |`
            );
            newRows = rows.join("\n");
        }
        else {
            // Other countries: single row with empty mint mark
            newRows = `| ${NEXT_YEAR} |          | 0          | 0                      | 0     |`;
        }

        // Insert the new row(s) right after the last table row with proper newline handling
        const lastRowEnd = lastMatch.index + lastMatch[0].length;
        const afterLastRow = content.slice(lastRowEnd);

        // Add newline + new row(s), making sure we don"t create extra blank lines
        const newContent = content.slice(0, lastRowEnd) + "\n" + newRows + afterLastRow;

        writeFileSync(coin.path, newContent, "utf-8");
    }
}

/**
 * Main function - entry point of the script
 */
async function main(): Promise<void> {
    const updater = new MintageUpdater();
    await updater.main();
}

// Run the script if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}

export {
    main,
    MintageUpdater
};

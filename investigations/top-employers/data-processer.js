const fs = require("fs");
const path = require("path");

const columns = [
  "ia",
  "company",
  "website",
  "description",
  "size",
  "compensation",
  "arrengement",
];

function processData() {
  const data = fs.readFileSync(
    path.join(__dirname, "top-employers-vma-per-ia.tsv"),
    "utf8"
  );
  const [_, ...lines] = data.split("\r\n");

  const companyTable = lines.map((line) => {
    const cells = line.split("\t");
    return columns.reduce((acc, column, i) => {
      let value = cells[i].replaceAll(",", "");
      if (["company", "size", "compensation"].includes(column)) {
        value = value.split("(")[0].trim();
      }

      if (column === "compensation") {
        const [min, max] = value.split("-");
        const minHasK = min.toLowerCase().includes("k");
        const maxHasK = max.toLowerCase().includes("k");

        return {
          ...acc,
          min_compensation:
            Number(min.replaceAll(/[^\d]/g, "")) * (minHasK ? 1000 : 1),
          max_compensation:
            Number(max.replaceAll(/[^\d]/g, "")) * (maxHasK ? 1000 : 1),
        };
      }

      return {
        ...acc,
        [column]: value,
      };
    }, {});
  });

  // aggregate by company
  const aggregatedCompanies = companyTable.reduce((acc, row) => {
    const company = row.company;
    if (!acc[company]) {
      acc[company] = {
        ...row,
        count: 1,
        min_compensations: [row.min_compensation],
        max_compensations: [row.max_compensation],
        average_compensation: Math.round(
          (row.min_compensation + row.max_compensation) / 2
        ),
      };
      return acc;
    }

    acc[company] = {
      ...acc[company],
      min_compensations: [
        ...acc[company].min_compensations,
        row.min_compensation,
      ],
      max_compensations: [
        ...acc[company].max_compensations,
        row.max_compensation,
      ],
      count: acc[company].count + 1,
    };

    acc[company] = {
      ...acc[company],
      average_compensation: Math.round(
        (acc[company].min_compensations.reduce((a, b) => a + b, 0) +
          acc[company].max_compensations.reduce((a, b) => a + b, 0)) /
          (2 * acc[company].count)
      ),
    };

    return acc;
  }, {});

  const aggregatedCompanyTable = Object.values(aggregatedCompanies)
    .map(
      ({
        average_compensation,
        company,
        website,
        description,
        size,
        arrengement,
        count,
      }) => ({
        company,
        website,
        description,
        size,
        arrengement,
        average_compensation,
        count,
      })
    )
    .sort((a, b) => b.count - a.count);

  const aggregatedCompanyTableColumns = Object.keys(aggregatedCompanyTable[0]);

  // save as CSV
  fs.writeFileSync(
    path.join(__dirname, "treated-data.csv"),
    [
      aggregatedCompanyTableColumns.join(","),
      ...aggregatedCompanyTable.map((row) => Object.values(row).join(",")),
    ].join("\r\n"),
    "utf8"
  );
}

processData();

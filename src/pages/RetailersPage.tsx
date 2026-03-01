import type { Dataset } from "../lib/dataLoader";

type RetailersPageProps = {
  data: Dataset;
};

export function RetailersPage({ data }: RetailersPageProps) {
  const parserHealth = new Map(
    data.metadata.parserHealth.map((entry) => [entry.retailerId, entry])
  );

  return (
    <section>
      <div className="section-header">
        <h1>Retailers</h1>
        <p>Initial top-12 Canadian retailers with parser status and recency.</p>
      </div>
      <table className="offer-table">
        <thead>
          <tr>
            <th>Retailer</th>
            <th>Status</th>
            <th>Offers</th>
            <th>Last Crawl</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {data.retailers.map((retailer) => {
            const health = parserHealth.get(retailer.id);
            return (
              <tr key={retailer.id}>
                <td>
                  <a href={retailer.homepageUrl} target="_blank" rel="noreferrer">
                    {retailer.name}
                  </a>
                </td>
                <td>{health?.status ?? "unknown"}</td>
                <td>{health?.offersCount ?? 0}</td>
                <td>{retailer.lastCrawledAt ? new Date(retailer.lastCrawledAt).toLocaleString() : "—"}</td>
                <td>{health?.warning ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

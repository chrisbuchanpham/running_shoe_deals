import { useEffect, useMemo, useState } from "react";
import {
  dealsFileSchema,
  metadataSchema,
  offersFileSchema,
  retailersFileSchema,
  shoesFileSchema,
  type DealCard,
  type Metadata,
  type Offer,
  type Retailer,
  type ShoeCanonical
} from "../shared/contracts";

type Dataset = {
  retailers: Retailer[];
  offers: Offer[];
  shoes: ShoeCanonical[];
  deals: DealCard[];
  metadata: Metadata;
};

type DataState = {
  loading: boolean;
  error?: string;
  data?: Dataset;
};

const DATA_FILE_PATHS = {
  retailers: "/data/retailers.json",
  offers: "/data/offers.json",
  shoes: "/data/shoes.json",
  deals: "/data/deals.json",
  metadata: "/data/metadata.json"
} as const;

function getResponsePreview(rawBody: string): string {
  const compactBody = rawBody.replace(/\s+/g, " ").trim();
  if (!compactBody) return "No response body.";
  if (compactBody.length <= 180) return compactBody;
  return `${compactBody.slice(0, 177)}...`;
}

async function fetchJsonData(filePath: string): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(filePath);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`Failed to load ${filePath}: network error (${reason}).`);
  }

  if (!response.ok) {
    let responseBody = "";
    try {
      responseBody = await response.text();
    } catch {
      responseBody = "";
    }

    const statusText = response.statusText ? ` ${response.statusText}` : "";
    const preview = getResponsePreview(responseBody);
    throw new Error(
      `Failed to load ${filePath}: HTTP ${response.status}${statusText}. Response preview: ${preview}`
    );
  }

  try {
    return await response.json();
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Invalid JSON response";
    throw new Error(`Failed to parse ${filePath}: ${reason}.`);
  }
}

export async function fetchDataset(): Promise<Dataset> {
  const [retailers, offers, shoes, deals, metadata] = await Promise.all([
    fetchJsonData(DATA_FILE_PATHS.retailers),
    fetchJsonData(DATA_FILE_PATHS.offers),
    fetchJsonData(DATA_FILE_PATHS.shoes),
    fetchJsonData(DATA_FILE_PATHS.deals),
    fetchJsonData(DATA_FILE_PATHS.metadata)
  ]);

  return {
    retailers: retailersFileSchema.parse(retailers),
    offers: offersFileSchema.parse(offers),
    shoes: shoesFileSchema.parse(shoes),
    deals: dealsFileSchema.parse(deals),
    metadata: metadataSchema.parse(metadata)
  };
}

export function useDataset(): DataState {
  const [state, setState] = useState<DataState>({ loading: true });

  useEffect(() => {
    fetchDataset()
      .then((data) => setState({ loading: false, data }))
      .catch((error: unknown) =>
        setState({
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load data."
        })
      );
  }, []);

  return state;
}

export function useLookupMaps(data?: Dataset): {
  offersById: Map<string, Offer>;
  shoesById: Map<string, ShoeCanonical>;
  retailersById: Map<string, Retailer>;
} {
  return useMemo(
    () => ({
      offersById: new Map(data?.offers.map((offer) => [offer.id, offer]) ?? []),
      shoesById: new Map(data?.shoes.map((shoe) => [shoe.shoeId, shoe]) ?? []),
      retailersById: new Map(
        data?.retailers.map((retailer) => [retailer.id, retailer]) ?? []
      )
    }),
    [data]
  );
}

export type { Dataset };

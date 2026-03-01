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

export async function fetchDataset(): Promise<Dataset> {
  const [retailers, offers, shoes, deals, metadata] = await Promise.all([
    fetch("/data/retailers.json").then((res) => res.json()),
    fetch("/data/offers.json").then((res) => res.json()),
    fetch("/data/shoes.json").then((res) => res.json()),
    fetch("/data/deals.json").then((res) => res.json()),
    fetch("/data/metadata.json").then((res) => res.json())
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
      retailersById: new Map(data?.retailers.map((retailer) => [retailer.id, retailer]) ?? [])
    }),
    [data]
  );
}

export type { Dataset };

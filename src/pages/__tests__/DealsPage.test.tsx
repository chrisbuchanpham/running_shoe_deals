import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DealsPage } from "../DealsPage";
import { buildTestDataset } from "../../lib/testData";

describe("DealsPage", () => {
  it("filters results by brand and query", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DealsPage data={buildTestDataset()} />
      </MemoryRouter>
    );

    expect(screen.getByText("2 matches")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Brand"), "ASICS");
    expect(screen.getByText("1 matches")).toBeInTheDocument();
    expect(screen.getByText("Gel Kayano 30")).toBeInTheDocument();
    expect(screen.getByText("Size W 6-11")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search"));
    await user.type(screen.getByLabelText("Search"), "6-11");
    expect(screen.getByText("1 matches")).toBeInTheDocument();
    expect(screen.getByText("Gel Kayano 30")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search"));
    await user.type(screen.getByLabelText("Search"), "pegasus");
    expect(screen.getByText("0 matches")).toBeInTheDocument();
  });
});

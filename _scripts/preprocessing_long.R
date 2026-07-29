library(googlesheets4)
library(janitor)
library(tidyverse)
library(sf)
library(rnaturalearth)
library(rnaturalearthdata)
library(jsonlite)

## google sheet laden (LONG format, multiple sheets: world, us_states, canada_states, australia_states)
sheet_url <- "https://docs.google.com/spreadsheets/d/1SxoLLX0InFR77yiANsrf-n-ai-oy9QmiPh5p7nU-lr8/edit"

df_world_long <- read_sheet(sheet_url, sheet = "world") %>% clean_names()
df_us_long    <- read_sheet(sheet_url, sheet = "us_states") %>% clean_names()
df_ca_long    <- read_sheet(sheet_url, sheet = "canada_states") %>% clean_names()
df_au_long    <- read_sheet(sheet_url, sheet = "australia_states") %>% clean_names()

## ---- shared constants ----

# leg_types that count toward "current" legal status (proposals don't confer status)
current_leg_types <- c("law", "amendment", "court ruling")

# standardize ad_type naming: "Assisted Dying" (source data) -> "Assisted Suicide" (map legend)
standardize_ad_type <- function(x) {
  recode(x, "Assisted Dying" = "Assisted Suicide", .default = x)
}

## ---- core transformation ----
## Takes one long-format sheet (many rows per jurisdiction) and returns
## ONE row per jurisdiction with: jurisdiction, region, category, has_proposal, entries_json

process_long_sheet <- function(df) {

  df <- df %>% mutate(ad_type = standardize_ad_type(ad_type))

  ## 1. CURRENT status per jurisdiction x ad_type
  ##    - ignore leg_type == "proposal" rows (they don't confer current status)
  ##    - take the row with the latest year
  ##    - fall back to an undated row's status if that's all there is
  ##      (e.g. a bare "status = 2 / unclear" assignment with no specific law attached)
  dated_status <- df %>%
    filter(leg_type %in% current_leg_types, !is.na(year)) %>%
    group_by(jurisdiction, ad_type) %>%
    slice_max(order_by = year, n = 1, with_ties = FALSE) %>%
    ungroup() %>%
    select(jurisdiction, ad_type, status)

  undated_status <- df %>%
    filter(is.na(year), !is.na(status)) %>%
    distinct(jurisdiction, ad_type, status)

  current_status <- bind_rows(dated_status, undated_status) %>%
    distinct(jurisdiction, ad_type, .keep_all = TRUE)

  ## 2. Collapse to ONE map category per jurisdiction (permissiveness hierarchy).
  ## Illegal outranks Unclear / in debate.
  ## Unclear only appears when status==2 is explicitly present in the data (not as a fallback).
  category_lookup <- current_status %>%
    pivot_wider(names_from = ad_type, values_from = status) %>%
    rowwise() %>%
    mutate(
      category = case_when(
        isTRUE(Euthanasia == 1) ~ "Euthanasia",
        isTRUE(`Assisted Suicide` == 1) ~ "Assisted Suicide",
        isTRUE(`Refusal of Treatment` == 1) ~ "Refusal of treatment",
        any(c(Euthanasia, `Assisted Suicide`, `Refusal of Treatment`) == 0, na.rm = TRUE) ~ "Illegal",
        any(c(Euthanasia, `Assisted Suicide`, `Refusal of Treatment`) == 2, na.rm = TRUE) ~ "Unclear / in debate",
        TRUE ~ NA_character_
      )
    ) %>%
    ungroup() %>%
    select(jurisdiction, category)

  ## 3. has_proposal flag — jurisdiction-level: TRUE if ANY row, in ANY domain,
  ##    has leg_type == "proposal"
  proposal_flag <- df %>%
    group_by(jurisdiction) %>%
    summarise(has_proposal = any(leg_type == "proposal", na.rm = TRUE), .groups = "drop")

  ## 4. Nested entries for the info panel: grouped by domain (Euthanasia /
  ##    Assisted Suicide / Refusal of Treatment), each with its full
  ##    law/amendment/court ruling/proposal history, ordered oldest -> newest.
  entries_by_domain <- df %>%
    filter(!is.na(ad_type)) %>%
    arrange(jurisdiction, ad_type, year) %>%
    group_by(jurisdiction, ad_type) %>%
    summarise(
      history = list(
        pmap(list(leg_type, year, label, number, url, note, status),
             function(leg_type, year, label, number, url, note, status) {
               list(leg_type = leg_type, year = year, label = label,
                    number = number, url = url, note = note, status = status)
             })
      ),
      .groups = "drop"
    )

  entries_nested <- entries_by_domain %>%
    group_by(jurisdiction) %>%
    summarise(
      entries_json = toJSON(setNames(as.list(history), ad_type), auto_unbox = TRUE, na = "null"),
      .groups = "drop"
    )

  ## 5. region (one value per jurisdiction; sub-national sheets may lack this column)
  region_lookup <- if ("region" %in% names(df)) {
    df %>%
      group_by(jurisdiction) %>%
      summarise(region = first(na.omit(region)), .groups = "drop")
  } else {
    df %>% distinct(jurisdiction) %>% mutate(region = NA_character_)
  }

  ## 6. combine into one row per jurisdiction
  region_lookup %>%
    left_join(category_lookup, by = "jurisdiction") %>%
    left_join(proposal_flag, by = "jurisdiction") %>%
    left_join(entries_nested, by = "jurisdiction")
}

## ---- run for each sheet ----
df_world <- process_long_sheet(df_world_long)
df_us    <- process_long_sheet(df_us_long)
df_ca    <- process_long_sheet(df_ca_long)
df_au    <- process_long_sheet(df_au_long)

## ---- join to geometries (unchanged from the original wide-format script) ----
world <- ne_countries(scale = "medium", returnclass = "sf") %>%
  left_join(df_world, by = c("name" = "jurisdiction")) %>%
  filter(!name %in% c("United States of America", "Canada", "Australia"))

us_states <- ne_states(country = "United States of America", returnclass = "sf") %>%
  left_join(df_us, by = c("name" = "jurisdiction"))

canada_states <- ne_states(country = "Canada", returnclass = "sf") %>%
  left_join(df_ca, by = c("name" = "jurisdiction"))

australia_states <- ne_states(country = "Australia", returnclass = "sf") %>%
  left_join(df_au, by = c("name" = "jurisdiction"))

## ---- combine + write ----
common_cols <- intersect(
  Reduce(intersect, list(names(world), names(us_states), names(canada_states), names(australia_states))),
  names(world)
)

world <- world %>% select(all_of(common_cols))
us_states <- us_states %>% select(all_of(common_cols))
canada_states <- canada_states %>% select(all_of(common_cols))
australia_states <- australia_states %>% select(all_of(common_cols))

world_joined <- rbind(world, us_states, canada_states, australia_states)

st_write(world_joined, "data/world_joined.geojson", delete_dsn = TRUE)

## ---- country-level GeoJSON for Archive heatmap ----
## Keeps US, Canada, Australia as whole-country shapes (not split into states)
world_countries <- ne_countries(scale = "medium", returnclass = "sf") %>%
  left_join(df_world, by = c("name" = "jurisdiction")) %>%
  select(any_of(c("name", "admin", "category", "has_proposal", "entries_json")))

st_write(world_countries, "data/world_countries.geojson", delete_dsn = TRUE)

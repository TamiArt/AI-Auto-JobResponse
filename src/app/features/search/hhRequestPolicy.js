export function buildHhSearchParams(request) {
  const params = new URLSearchParams({
    q: request.query,
    area: request.areaId,
    page: String(Math.max(0, request.pages?.hh ?? request.page ?? 0)),
  });

  if (request.experience !== "any") params.set("experience", request.experience);

  // HH's salary search is a "close to" query and may also convert currencies upstream.
  // JOBOS performs the authoritative exact range/currency filter after normalization,
  // so upstream salary narrowing would risk silently dropping valid vacancies.
  if (request.salaryFrom || request.salaryTo) params.set("label", "with_salary");

  return params;
}

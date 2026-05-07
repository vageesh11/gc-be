'use strict';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

/**
 * Parse and clamp pagination query params from req.query.
 * @param {object} query - req.query
 * @returns {{ limit: number, offset: number, page: number }}
 */
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build the pagination metadata object to include in responses.
 * @param {number} total  - total record count from COUNT(*)
 * @param {number} page
 * @param {number} limit
 * @returns {{ total: number, page: number, limit: number, total_pages: number, has_next: boolean, has_prev: boolean }}
 */
function buildMeta(total, page, limit) {
  const totalInt  = Number(total);
  const totalPages = Math.ceil(totalInt / limit) || 1;
  return {
    total:       totalInt,
    page,
    limit,
    total_pages: totalPages,
    has_next:    page < totalPages,
    has_prev:    page > 1,
  };
}

module.exports = { parsePagination, buildMeta, DEFAULT_LIMIT, MAX_LIMIT };

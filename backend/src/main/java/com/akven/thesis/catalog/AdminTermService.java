package com.akven.thesis.catalog;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.catalog.AdminCatalogDtos.*;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.ConflictException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.common.Slugs;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The owners' own sections (Classic, Sport, ...) and cuts (Mid-long, ...): create, rename, hide, reorder, delete.
 * STAFF and ADMIN may manage them (it is merchandising, not pricing). Every change is audited.
 * A term that products still use cannot be deleted (409); hide it instead, or move the products first.
 */
@Service
@Transactional
@PreAuthorize("hasAnyRole('STAFF','ADMIN')")
public class AdminTermService {

    static final String TERM = "TERM";

    private final CatalogTermRepository termRepository;
    private final ProductRepository productRepository;
    private final AuditService auditService;

    public AdminTermService(CatalogTermRepository termRepository, ProductRepository productRepository,
                            AuditService auditService) {
        this.termRepository = termRepository;
        this.productRepository = productRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<AdminTermView> list(TermKind kind) {
        return termRepository.findByKindOrderByPositionAscNameAsc(kind).stream()
                .map(t -> AdminTermView.of(t, usage(t))).toList();
    }

    public AdminTermView create(String actor, CreateTermRequest r) {
        String name = r.name().trim();
        String slug = Slugs.unique(name, candidate -> termRepository.existsByKindAndSlug(r.kind(), candidate));
        int position = termRepository.findByKindOrderByPositionAscNameAsc(r.kind()).stream()
                .mapToInt(CatalogTerm::getPosition).max().orElse(-1) + 1;
        CatalogTerm saved = termRepository.saveAndFlush(
                new CatalogTerm(r.kind(), slug, name, blankToNull(r.description()), position));
        auditService.record(actor, "TERM_CREATED", TERM, saved.getId(), null, snapshot(saved));
        return AdminTermView.of(saved, 0);
    }

    public AdminTermView update(String actor, UUID id, UpdateTermRequest r) {
        CatalogTerm term = require(id);
        Map<String, Object> before = snapshot(term);
        term.update(r.name().trim(), blankToNull(r.description()), r.active());
        termRepository.saveAndFlush(term);
        auditService.record(actor, "TERM_UPDATED", TERM, id, before, snapshot(term));
        return AdminTermView.of(term, usage(term));
    }

    /** The given ids become positions 0..n-1. Ids of the other kind, or unknown ids, are rejected. */
    public List<AdminTermView> reorder(String actor, ReorderTermsRequest r) {
        Map<UUID, CatalogTerm> byId = new HashMap<>();
        termRepository.findByKindOrderByPositionAscNameAsc(r.kind()).forEach(t -> byId.put(t.getId(), t));
        if (r.ids().stream().distinct().count() != r.ids().size() || !byId.keySet().containsAll(r.ids())) {
            throw new BusinessRuleException("The list must contain each " + r.kind().name().toLowerCase() + " once.");
        }
        int position = 0;
        for (UUID id : r.ids()) {
            byId.remove(id).moveTo(position++);
        }
        for (CatalogTerm leftover : byId.values()) {     // ids the client left out keep their relative order, after the listed ones
            leftover.moveTo(position++);
        }
        termRepository.flush();
        auditService.record(actor, "TERMS_REORDERED", TERM, r.ids().get(0), null, Map.of("kind", r.kind(), "ids", r.ids()));
        return list(r.kind());
    }

    public void delete(String actor, UUID id) {
        CatalogTerm term = require(id);
        long inUse = usage(term);
        if (inUse > 0) {
            throw new ConflictException("'" + term.getName() + "' is used by " + inUse
                    + (inUse == 1 ? " product" : " products") + ". Hide it instead, or move those products first.");
        }
        Map<String, Object> before = snapshot(term);
        termRepository.delete(term);
        termRepository.flush();
        auditService.record(actor, "TERM_DELETED", TERM, id, before, null);
    }

    private long usage(CatalogTerm t) {
        return t.getKind() == TermKind.SECTION ? productRepository.countBySectionId(t.getId())
                                               : productRepository.countByCutId(t.getId());
    }

    private CatalogTerm require(UUID id) {
        return termRepository.findById(id).orElseThrow(() -> new NotFoundException("Section or cut not found: " + id));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static Map<String, Object> snapshot(CatalogTerm t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("kind", t.getKind());
        m.put("slug", t.getSlug());
        m.put("name", t.getName());
        m.put("description", t.getDescription());
        m.put("position", t.getPosition());
        m.put("active", t.isActive());
        return m;
    }
}

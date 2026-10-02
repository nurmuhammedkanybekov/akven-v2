package com.akven.thesis.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CatalogTermRepository extends JpaRepository<CatalogTerm, UUID> {

    List<CatalogTerm> findByKindOrderByPositionAscNameAsc(TermKind kind);

    List<CatalogTerm> findByKindAndActiveTrueOrderByPositionAscNameAsc(TermKind kind);

    Optional<CatalogTerm> findByIdAndKind(UUID id, TermKind kind);

    boolean existsByKindAndSlug(TermKind kind, String slug);

    List<CatalogTerm> findByIdIn(Collection<UUID> ids);
}

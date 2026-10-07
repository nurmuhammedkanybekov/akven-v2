package com.akven.thesis.sizes;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.ConflictException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.sizes.SizeDtos.Chart;
import com.akven.thesis.sizes.SizeDtos.Match;
import com.akven.thesis.sizes.SizeDtos.RowRequest;
import com.akven.thesis.sizes.SizeDtos.RowView;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * The size chart. English-speaking customers usually know EU or US shoe sizes; customers in Kyrgyzstan, Kazakhstan
 * and Russia know the local (RU) sizes. The chart is one table, and the language decides which columns lead.
 */
@Service
public class SizeChartService {

    private static final List<String> WESTERN = List.of("footCm", "eu", "us", "krMm");
    private static final List<String> LOCAL = List.of("footCm", "local", "krMm");

    private final SizeChartRowRepository rows;
    private final AuditService audit;

    public SizeChartService(SizeChartRowRepository rows, AuditService audit) {
        this.rows = rows;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Chart chart(String lang) {
        String l = lang == null ? "en" : lang.toLowerCase();
        List<String> columns = l.equals("ru") || l.equals("ky") ? LOCAL : WESTERN;
        return new Chart(columns == LOCAL ? l : "en", columns, rows.findAllByOrderByPositionAscLabelAsc().stream().map(RowView::of).toList());
    }

    @Transactional(readOnly = true)
    public Match find(SizeSystem system, BigDecimal size) {
        List<String> labels = rows.findAllByOrderByPositionAscLabelAsc().stream().filter(r -> r.fits(system, size))
                .map(SizeChartRow::getLabel).toList();
        if (labels.isEmpty()) {
            throw new NotFoundException("We have no sock size for that shoe size yet.");
        }
        return new Match(system, size, labels);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public RowView create(String actorEmail, RowRequest r) {
        check(r, null);
        SizeChartRow row = rows.saveAndFlush(new SizeChartRow(r));
        RowView view = RowView.of(row);
        audit.record(actorEmail, "SIZE_ROW_CREATED", "SIZE_CHART_ROW", row.getId(), null, view);
        return view;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public RowView update(String actorEmail, UUID id, RowRequest r) {
        SizeChartRow row = rows.findById(id).orElseThrow(() -> new NotFoundException("Size not found."));
        check(r, id);
        RowView before = RowView.of(row);
        row.update(r);
        RowView after = RowView.of(rows.saveAndFlush(row));
        audit.record(actorEmail, "SIZE_ROW_UPDATED", "SIZE_CHART_ROW", id, before, after);
        return after;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(String actorEmail, UUID id) {
        SizeChartRow row = rows.findById(id).orElseThrow(() -> new NotFoundException("Size not found."));
        RowView before = RowView.of(row);
        rows.delete(row);
        audit.record(actorEmail, "SIZE_ROW_DELETED", "SIZE_CHART_ROW", id, before, null);
    }

    private void check(RowRequest r, UUID except) {
        if (r.footCmMax().compareTo(r.footCmMin()) < 0 || r.krMmMax() < r.krMmMin()
                || r.localMax().compareTo(r.localMin()) < 0 || r.euMax().compareTo(r.euMin()) < 0) {
            throw new BusinessRuleException("Each range must start at or below where it ends.");
        }
        rows.findByLabelIgnoreCase(r.label().trim()).filter(x -> !x.getId().equals(except)).ifPresent(x -> {
            throw new ConflictException("There is already a size called " + x.getLabel() + ".");
        });
    }
}

package com.akven.thesis.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** One picture of a product. Position 0 is the cover image shown on catalog cards. */
@Entity
@Table(name = "product_image")
public class ProductImage {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID productId;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(nullable = false)
    private String alt;

    @Column(nullable = false)
    private int position;

    protected ProductImage() {
        // JPA
    }

    public ProductImage(UUID productId, String url, String alt, int position) {
        this.productId = productId;
        this.url = url;
        this.alt = alt;
        this.position = position;
    }

    public UUID getProductId() { return productId; }
    public String getUrl() { return url; }
    public String getAlt() { return alt; }
    public int getPosition() { return position; }
}

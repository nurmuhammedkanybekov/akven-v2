package com.akven.thesis.catalog;

import jakarta.persistence.*;
import java.util.UUID;

/** A sock design/style, e.g. "Ak&Ven Wool Crew". Variants (size/color/pack) hang off this. */
@Entity
@Table(name = "product")
public class Product {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String collection;

    @Column(length = 2000)
    private String description;

    /** e.g. "80% merino wool / 20% nylon" — sourced from the Korean manufacturing partner. */
    private String fabricComposition;

    protected Product() {
        // JPA
    }

    public Product(String name, String collection, String description, String fabricComposition) {
        this.name = name;
        this.collection = collection;
        this.description = description;
        this.fabricComposition = fabricComposition;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getCollection() { return collection; }
    public String getDescription() { return description; }
    public String getFabricComposition() { return fabricComposition; }
}

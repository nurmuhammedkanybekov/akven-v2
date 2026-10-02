package com.akven.thesis.negotiation;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The HTTP side, against a tiny local server standing in for the model provider. */
class OpenAiCompatibleChatClientTest {

    private HttpServer server;
    private final AtomicReference<String> auth = new AtomicReference<>("unset");
    private final AtomicReference<String> body = new AtomicReference<>();
    private final AtomicReference<String> path = new AtomicReference<>();
    private volatile int status = 200;
    private volatile String reply = "{\"choices\":[{\"message\":{\"content\":\"{\\\"discountPct\\\":5,\\\"reply\\\":\\\"hi\\\"}\"}}]}";

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", ex -> {
            auth.set(String.valueOf(ex.getRequestHeaders().getFirst("Authorization")));
            path.set(ex.getRequestURI().getPath());
            body.set(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] out = reply.getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(status, out.length);
            ex.getResponseBody().write(out);
            ex.close();
        });
        server.start();
    }

    @AfterEach
    void stop() { server.stop(0); }

    private OpenAiCompatibleChatClient client(String key, Duration timeout) {
        return new OpenAiCompatibleChatClient("http://127.0.0.1:" + server.getAddress().getPort() + "/v1/", key, "test-model", timeout);
    }

    @Test
    void sendsTheKeyAndTheMessagesAndReturnsTheModelText() throws Exception {
        String text = client("secret-key", Duration.ofSeconds(5)).complete("be nice", "hello");
        assertThat(text).contains("discountPct");
        assertThat(path.get()).isEqualTo("/v1/chat/completions");
        assertThat(auth.get()).isEqualTo("Bearer secret-key");
        assertThat(body.get()).contains("\"model\":\"test-model\"").contains("be nice").contains("hello").contains("json_object");
    }

    @Test
    void worksWithoutAKeyForLocalModels() throws Exception {
        client("", Duration.ofSeconds(5)).complete("s", "u");
        assertThat(auth.get()).isEqualTo("null");
    }

    @Test
    void anErrorStatusIsAnExceptionThatNeverEchoesTheBody() {
        status = 500;
        reply = "internal details secret-key";
        assertThatThrownBy(() -> client("secret-key", Duration.ofSeconds(5)).complete("s", "u"))
                .isInstanceOf(IOException.class).hasMessageContaining("500").hasMessageNotContaining("secret");
    }

    @Test
    void aReplyWithoutTextIsAnException() {
        reply = "{\"choices\":[]}";
        assertThatThrownBy(() -> client("k", Duration.ofSeconds(5)).complete("s", "u")).isInstanceOf(IOException.class);
    }

    @Test
    void aSlowModelTimesOut() {
        server.removeContext("/");
        server.createContext("/", ex -> { try { Thread.sleep(1500); } catch (InterruptedException ignored) { } ex.close(); });
        assertThatThrownBy(() -> client("k", Duration.ofMillis(300)).complete("s", "u")).isInstanceOf(IOException.class);
    }
}

//! Volcado de los módulos de un Code128 para verificación externa.
//!
//! `cargo run --example dump_modulos -- "TEXTO"` imprime un 1 por módulo de
//! barra y un 0 por módulo de espacio. Sirve para rasterizar el código fuera
//! de Rust y decodificarlo con un lector real, comprobando que lo que se
//! imprime es exactamente lo que un escáner va a leer.
fn main() {
    let texto = std::env::args().nth(1).unwrap_or_else(|| "SKU-1004".into());
    let modulos = rustock_lib::domain::etiqueta::code128_modulos(&texto).expect("codificable");
    let linea: String = modulos.iter().map(|b| if *b { '1' } else { '0' }).collect();
    println!("{linea}");
}
